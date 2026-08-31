import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const INTERVAL_SYNC_MS = 10000;
const INTERVAL_STATUS_MS = 5000;

function formatSse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const encoder = new TextEncoder();
  let lastStatus: string | null = null;
  let alive = true;
  const timers: ReturnType<typeof setInterval>[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const kirim = (event: string, data: unknown) => {
          if (alive) controller.enqueue(encoder.encode(formatSse(event, data)));
        };

        const awal = await prisma.pesertaUjian.findUnique({
          where: { id },
          select: { status: true, waktuMulai: true, pesanAdmin: true },
        });
        if (!awal) {
          kirim('error', { pesan: 'Peserta tidak ditemukan' });
          controller.close();
          return;
        }
        lastStatus = awal.status;
        kirim('sync', {
          waktuMulai: awal.waktuMulai,
          status: awal.status,
          now: new Date().toISOString(),
        });
        if (awal.pesanAdmin) {
          kirim('pesan', { pesan: awal.pesanAdmin });
        }

        const timerSync = setInterval(async () => {
          try {
            const data = await prisma.pesertaUjian.findUnique({
              where: { id },
              select: { waktuMulai: true, pesanAdmin: true },
            });
            kirim('sync', {
              waktuMulai: data?.waktuMulai ?? null,
              now: new Date().toISOString(),
            });
            if (data?.pesanAdmin) {
              kirim('pesan', { pesan: data.pesanAdmin });
            }
          } catch (err) {
            console.error('SSE sync error:', err);
          }
        }, INTERVAL_SYNC_MS);
        timers.push(timerSync);

        const timerStatus = setInterval(async () => {
          try {
            const data = await prisma.pesertaUjian.findUnique({
              where: { id },
              select: { status: true },
            });
            if (data && data.status !== lastStatus) {
              lastStatus = data.status;
              kirim('status', { status: data.status });
              if (data.status !== 'sedang_ujian') {
                clearInterval(timerSync);
                clearInterval(timerStatus);
                controller.close();
                alive = false;
              }
            }
          } catch (err) {
            console.error('SSE status error:', err);
          }
        }, INTERVAL_STATUS_MS);
        timers.push(timerStatus);
      } catch (err) {
        console.error('SSE setup error:', err);
        controller.error(err);
      }
    },
    cancel() {
      alive = false;
      timers.forEach((t) => clearInterval(t));
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}