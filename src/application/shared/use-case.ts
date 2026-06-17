/**
 * «Interface» UseCase<I, O>
 *
 * All use-cases implement this single-method contract (ISP: the interface is
 * as narrow as possible). This abstraction enables the AOP Decorator pattern:
 * LoggingDecorator, MetricsDecorator, CacheDecorator, AuthorizationDecorator
 * all wrap a UseCase<I,O> without the inner implementation knowing it (OCP).
 *
 * In NestJS (layers 3-4) the same pattern maps to Interceptors/Guards/Filters,
 * but the contract defined here keeps the application layer framework-agnostic.
 *
 * Example (AOP via Decorator — from GUIA_IA §7):
 *
 *   class LoggingUseCase<I,O> implements UseCase<I,O> {
 *     constructor(private inner: UseCase<I,O>, private log: Logger) {}
 *     async execute(input: I): Promise<O> {
 *       this.log.info(`IN  ${this.inner.constructor.name}`);
 *       const result = await this.inner.execute(input);
 *       this.log.info(`OUT ${this.inner.constructor.name}`);
 *       return result;
 *     }
 *   }
 */
export interface UseCase<I, O> {
  execute(input: I): Promise<O>;
}
