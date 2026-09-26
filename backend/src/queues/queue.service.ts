import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import logger from '../utils/logger';

export type JobType =
  | 'lead-import'
  | 'message-send'
  | 'message-retry'
  | 'ai-analysis'
  | 'ai-response'
  | 'excel-export'
  | 'retention-cleanup';

export interface EnqueueOptions {
  attempts?: number;
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  delay?: number;
}

class QueueService {
  private redisClient: Redis | null = null;
  private queues: Map<JobType, Queue> = new Map();
  private workers: Map<JobType, Worker> = new Map();
  private isRedisConnected = false;
  private inMemoryQueue: Array<{
    type: JobType;
    data: any;
    handler: (data: any) => Promise<any>;
  }> = [];
  private isProcessingMemoryQueue = false;

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const useRedis = process.env.USE_REDIS_QUEUE === 'true';

    if (useRedis) {
      try {
        this.redisClient = new Redis(redisUrl, {
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          retryStrategy: (times) => {
            if (times > 3) {
              logger.warn('Redis unreachable. Switching queue to resilient in-memory async processor.');
              this.redisClient?.disconnect();
              this.isRedisConnected = false;
              return null;
            }
            return Math.min(times * 200, 2000);
          },
        });

        this.redisClient.on('connect', () => {
          this.isRedisConnected = true;
          logger.info('Connected to Redis server for BullMQ job queues.');
        });

        this.redisClient.on('error', (err) => {
          logger.warn({ err: err.message }, 'Redis error detected, using internal async worker queue');
        });
      } catch (err) {
        logger.warn('Failed to initialize Redis connection, using in-memory worker queue');
      }
    } else {
      logger.info('USE_REDIS_QUEUE is false. Utilizing built-in async worker queue.');
    }
  }

  /**
   * Register a worker/processor for a specific job queue
   */
  public registerWorker(jobType: JobType, processor: (data: any) => Promise<any>): void {
    if (this.isRedisConnected && this.redisClient) {
      try {
        const worker = new Worker(
          jobType,
          async (job: Job) => {
            logger.info({ jobType, jobId: job.id }, 'Processing BullMQ background job');
            return await processor(job.data);
          },
          {
            connection: this.redisClient as any,
            concurrency: 5,
            limiter: {
              max: 20, // Max 20 messages per second (Rate control)
              duration: 1000,
            },
          }
        );

        worker.on('completed', (job) => {
          logger.info({ jobType, jobId: job.id }, 'BullMQ job completed successfully');
        });

        worker.on('failed', (job, err) => {
          logger.error({ jobType, jobId: job?.id, err }, 'BullMQ job execution failed');
        });

        this.workers.set(jobType, worker);
      } catch (err) {
        logger.warn({ jobType }, 'Could not register BullMQ worker, using memory fallback');
      }
    }
  }

  /**
   * Add a job to queue
   */
  public async addJob(
    jobType: JobType,
    data: any,
    options?: EnqueueOptions,
    inMemoryFallbackHandler?: (data: any) => Promise<any>
  ): Promise<{ queued: boolean; jobId?: string }> {
    if (this.isRedisConnected && this.redisClient) {
      let queue = this.queues.get(jobType);
      if (!queue) {
        queue = new Queue(jobType, { connection: this.redisClient as any });
        this.queues.set(jobType, queue);
      }

      const job = await queue.add(jobType, data, {
        attempts: options?.attempts || 3,
        backoff: options?.backoff || { type: 'exponential', delay: 1000 },
        delay: options?.delay || 0,
      });

      return { queued: true, jobId: job.id };
    }

    // Resilient asynchronous in-memory processor
    if (inMemoryFallbackHandler) {
      this.inMemoryQueue.push({ type: jobType, data, handler: inMemoryFallbackHandler });
      this.triggerMemoryQueueProcess();
    } else {
      logger.warn({ jobType }, 'No memory fallback handler supplied for job.');
    }

    return { queued: true, jobId: `mem-${Date.now()}` };
  }

  private async triggerMemoryQueueProcess() {
    if (this.isProcessingMemoryQueue) return;
    this.isProcessingMemoryQueue = true;

    setImmediate(async () => {
      while (this.inMemoryQueue.length > 0) {
        const item = this.inMemoryQueue.shift();
        if (item) {
          try {
            logger.info({ jobType: item.type }, 'Processing in-memory async job');
            await item.handler(item.data);
          } catch (err) {
            logger.error({ jobType: item.type, err }, 'In-memory job processing failed');
          }
        }
      }
      this.isProcessingMemoryQueue = false;
    });
  }
}

export const queueService = new QueueService();
export default queueService;

