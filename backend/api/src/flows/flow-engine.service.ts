import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { FlowNodeType, FlowRunStatus, FlowTriggerType, MessageDirection, MessageKind, MessageStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../shared/prisma.service';
import { WhatsappBridgeService } from '../whatsapp-bridge/whatsapp-bridge.service';

// Contexto que viaja con cada ejecución de flujo.
interface RunContext {
  customerId: string;
  // Para reanudar tras un DELAY: nodo donde continuar y cuándo.
  resumeNodeId?: string;
  resumeAt?: string; // ISO
  vars?: Record<string, unknown>;
}

@Injectable()
export class FlowEngineService {
  private readonly logger = new Logger(FlowEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bridge: WhatsappBridgeService,
  ) {}

  /**
   * Dispara todos los flujos ACTIVE de un triggerType para un cliente.
   * Lo llaman los eventos del sistema (pago confirmado, lead, etc.).
   */
  async trigger(triggerType: FlowTriggerType, customerId: string) {
    const flows = await this.prisma.flow.findMany({
      where: { triggerType, status: 'ACTIVE' },
      include: { nodes: true, edges: true },
    });
    for (const flow of flows) {
      try {
        await this.startRun(flow.id, customerId);
      } catch (err) {
        this.logger.warn(`Flujo ${flow.code}: no se pudo iniciar para ${customerId}: ${(err as Error).message}`);
      }
    }
  }

  /** Crea un FlowRun y arranca desde el nodo TRIGGER. */
  async startRun(flowId: string, customerId: string) {
    const flow = await this.prisma.flow.findUnique({
      where: { id: flowId },
      include: { nodes: true, edges: true },
    });
    if (!flow) return;

    const trigger = flow.nodes.find((n) => n.type === FlowNodeType.TRIGGER);
    if (!trigger) {
      this.logger.warn(`Flujo ${flow.code} sin nodo TRIGGER, se omite.`);
      return;
    }

    const run = await this.prisma.flowRun.create({
      data: {
        flowId: flow.id,
        customerId,
        currentNodeId: trigger.id,
        status: FlowRunStatus.RUNNING,
        context: { customerId } as Prisma.InputJsonValue,
      },
    });

    await this.advance(run.id, trigger.id, { customerId });
  }

  /**
   * Avanza la ejecución desde un nodo: ejecuta los siguientes nodos en cadena
   * hasta encontrar un DELAY (pausa) o terminar.
   */
  private async advance(runId: string, fromNodeId: string, ctx: RunContext) {
    const run = await this.prisma.flowRun.findUnique({
      where: { id: runId },
      include: { flow: { include: { nodes: true, edges: true } } },
    });
    if (!run || run.status !== FlowRunStatus.RUNNING) return;

    const { nodes, edges } = run.flow;
    const customer = await this.prisma.customer.findUnique({ where: { id: ctx.customerId } });
    if (!customer) {
      await this.finish(runId, FlowRunStatus.FAILED);
      return;
    }

    let currentId: string | null = fromNodeId;
    let guard = 0; // evita bucles infinitos

    while (currentId && guard++ < 100) {
      const node = nodes.find((n) => n.id === currentId);
      if (!node) break;

      // Elegir la rama de salida (kind) según el tipo de nodo.
      let chosenKind: string | null = null;

      if (node.type === FlowNodeType.MESSAGE) {
        await this.sendMessage(node.body || '', customer);
      } else if (node.type === FlowNodeType.CONDITION) {
        // Condición simple: por tag. config = { tag: 'comprador' }
        const cfg = (node.config as { tag?: string }) || {};
        const ok = cfg.tag ? customer.tags.includes(cfg.tag) : true;
        chosenKind = ok ? null : 'alt'; // salida principal = sí, 'alt' = no
      } else if (node.type === FlowNodeType.DELAY) {
        // config = { minutes: N } o { hours: N }. Pausa y programa reanudación.
        const cfg = (node.config as { minutes?: number; hours?: number }) || {};
        const mins = (cfg.hours ? cfg.hours * 60 : 0) + (cfg.minutes || 0) || 60;
        const resumeAt = new Date(Date.now() + mins * 60_000);
        const next = this.nextNode(edges, node.id, null);
        await this.prisma.flowRun.update({
          where: { id: runId },
          data: {
            currentNodeId: node.id,
            context: { ...ctx, resumeNodeId: next || undefined, resumeAt: resumeAt.toISOString() } as Prisma.InputJsonValue,
          },
        });
        return; // el scheduler lo reanudará
      } else if (node.type === FlowNodeType.ACTION) {
        await this.runAction(node, customer);
      }
      // TRIGGER no hace nada, solo continúa.

      currentId = this.nextNode(edges, node.id, chosenKind);
      if (currentId) {
        await this.prisma.flowRun.update({ where: { id: runId }, data: { currentNodeId: currentId } });
      }
    }

    await this.finish(runId, FlowRunStatus.COMPLETED);
  }

  /** Siguiente nodo siguiendo el edge de la rama indicada (kind null = salida principal). */
  private nextNode(edges: { fromNodeId: string; toNodeId: string; kind: string | null }[], fromId: string, kind: string | null): string | null {
    const edge = edges.find((e) => e.fromNodeId === fromId && (e.kind || null) === (kind || null))
      // fallback: si no hay rama específica, toma cualquier salida del nodo
      || edges.find((e) => e.fromNodeId === fromId);
    return edge ? edge.toNodeId : null;
  }

  /** Envía un mensaje de WhatsApp y lo registra en la conversación. */
  private async sendMessage(body: string, customer: { id: string; phone: string; fullName: string }) {
    if (!body.trim()) return;
    const text = body.replace(/\{nombre\}/gi, (customer.fullName || '').split(' ')[0] || '');
    const remoteJid = customer.phone.replace('+', '') + '@s.whatsapp.net';
    try {
      await this.bridge.sendText(remoteJid, text);
      const convo = await this.prisma.conversation.findUnique({ where: { remoteJid } });
      if (convo) {
        await this.prisma.message.create({
          data: {
            conversationId: convo.id,
            direction: MessageDirection.OUTBOUND,
            kind: MessageKind.TEXT,
            status: MessageStatus.SENT,
            body: text,
            sentAt: new Date(),
          },
        });
      }
    } catch (err) {
      this.logger.warn(`Flujo: fallo al enviar a ${customer.phone}: ${(err as Error).message}`);
    }
  }

  /** Acciones simples: config = { type: 'add_tag'|'remove_tag', tag } */
  private async runAction(node: { config: Prisma.JsonValue }, customer: { id: string; tags: string[] }) {
    const cfg = (node.config as { type?: string; tag?: string }) || {};
    if (!cfg.type || !cfg.tag) return;
    if (cfg.type === 'add_tag' && !customer.tags.includes(cfg.tag)) {
      await this.prisma.customer.update({ where: { id: customer.id }, data: { tags: { push: cfg.tag } } });
    } else if (cfg.type === 'remove_tag') {
      await this.prisma.customer.update({ where: { id: customer.id }, data: { tags: customer.tags.filter((t) => t !== cfg.tag) } });
    }
  }

  private async finish(runId: string, status: FlowRunStatus) {
    await this.prisma.flowRun.update({
      where: { id: runId },
      data: { status, finishedAt: new Date() },
    });
  }

  /** Scheduler: cada minuto reanuda las ejecuciones cuyo DELAY ya venció. */
  @Cron('30 * * * * *')
  async resumeDelayed() {
    const running = await this.prisma.flowRun.findMany({ where: { status: FlowRunStatus.RUNNING } });
    const now = Date.now();
    for (const run of running) {
      const ctx = (run.context as unknown as RunContext) || {};
      if (ctx.resumeAt && new Date(ctx.resumeAt).getTime() <= now && ctx.resumeNodeId) {
        // Limpia el marcador de delay y continúa.
        const cleanCtx: RunContext = { customerId: ctx.customerId, vars: ctx.vars };
        await this.prisma.flowRun.update({ where: { id: run.id }, data: { context: cleanCtx as Prisma.InputJsonValue } });
        await this.advance(run.id, ctx.resumeNodeId, cleanCtx);
      }
    }
  }
}
