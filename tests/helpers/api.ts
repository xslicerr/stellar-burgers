import { fileURLToPath } from 'node:url';

import { expect, test as base } from '@playwright/test';

import type { Request } from '@playwright/test';

type HarScenario =
  | 'api'
  | 'ingredients'
  | 'scenarios/ingredients-error'
  | 'scenarios/order-created'
  | 'scenarios/order-error'
  | 'scenarios/order-with-sauce'
  | 'scenarios/orders-multiple'
  | 'scenarios/orders-pending'
  | 'scenarios/profile-updated'
  | 'scenarios/registered-user';

type ApiRequest = {
  path: string;
  method: string;
  body: Record<string, unknown>;
};

type MockApi = {
  requests: ApiRequest[];
  useHar: (scenario: HarScenario) => Promise<void>;
};

export const test = base.extend<{ api: MockApi }>({
  api: [
    async ({ page }, use) => {
      const requests: ApiRequest[] = [];
      const failedRequests: string[] = [];
      const isApiRequest = (request: Request): boolean =>
        new URL(request.url()).pathname.startsWith('/api/');
      const recordRequest = (request: Request): void => {
        if (!isApiRequest(request)) return;
        requests.push({
          path: new URL(request.url()).pathname.slice('/api'.length),
          method: request.method(),
          body: request.postData()
            ? (request.postDataJSON() as Record<string, unknown>)
            : {},
        });
      };
      const recordFailure = (request: Request): void => {
        if (
          isApiRequest(request) &&
          request.failure()?.errorText !== 'net::ERR_ABORTED'
        ) {
          failedRequests.push(`${request.method()} ${request.url()}`);
        }
      };
      const useHar = async (scenario: HarScenario): Promise<void> => {
        await page.routeFromHAR(
          fileURLToPath(new URL(`../fixtures/${scenario}.har`, import.meta.url)),
          {
            url: '**/api/**',
            update: false,
            // Дополнительные сценарии ищут остальные ответы в базовых HAR.
            notFound: 'fallback',
          }
        );
      };

      // Последний обработчик в цепочке прерывает любой неизвестный запрос.
      await page.routeFromHAR(
        fileURLToPath(new URL('../fixtures/api.har', import.meta.url)),
        { url: '**/api/**', update: false, notFound: 'abort' }
      );
      await useHar('ingredients');
      page.on('request', recordRequest);
      page.on('requestfailed', recordFailure);

      await use({ requests, useHar });

      page.off('request', recordRequest);
      page.off('requestfailed', recordFailure);
      expect(failedRequests, 'Все запросы API должны находить ответ в HAR').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect } from '@playwright/test';
