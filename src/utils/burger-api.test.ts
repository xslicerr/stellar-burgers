import { fetchWithRefresh, getIngredientsApi } from './burger-api';
import { deleteCookie, getCookie, setCookie } from './cookie';

afterEach(() => {
  jest.restoreAllMocks();
  localStorage.clear();
  deleteCookie('accessToken');
});

test('success:false считается ошибкой даже при HTTP 200', async () => {
  jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(Response.json({ success: false, message: 'Данные недоступны' }));
  await expect(getIngredientsApi()).rejects.toThrow('Данные недоступны');
});

test('просроченный accessToken обновляется и запрос повторяется с новым токеном', async () => {
  setCookie('accessToken', 'Bearer old');
  localStorage.setItem('refreshToken', 'refresh-old');
  const fetchMock = jest
    .spyOn(globalThis, 'fetch')
    .mockResolvedValueOnce(Response.json({ message: 'jwt expired' }, { status: 403 }))
    .mockResolvedValueOnce(
      Response.json({
        success: true,
        accessToken: 'Bearer new',
        refreshToken: 'refresh-new',
      })
    )
    .mockResolvedValueOnce(
      Response.json({
        success: true,
        user: { name: 'Никита', email: 'test@example.com' },
      })
    );
  const result = await fetchWithRefresh<{ success: boolean }>(
    'https://norma.ffapi.ru/api/auth/user',
    {
      headers: { authorization: 'Bearer old' },
    }
  );
  expect(result.success).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(getCookie('accessToken')).toBe('Bearer new');
  expect(localStorage.getItem('refreshToken')).toBe('refresh-new');
  expect(fetchMock.mock.calls[2][1]?.headers).toEqual({ authorization: 'Bearer new' });
});

test('сетевая ошибка сохраняет исходное сообщение', async () => {
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Нет подключения'));
  await expect(fetchWithRefresh('/orders', {})).rejects.toThrow('Нет подключения');
});

test('два параллельных запроса с истёкшим токеном обновляют его одним запросом', async () => {
  let refreshRequests = 0;
  jest.spyOn(globalThis, 'fetch').mockImplementation((url, options) => {
    const address =
      typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    if (address.endsWith('/auth/token')) {
      refreshRequests++;
      return Promise.resolve(
        Response.json({
          success: true,
          accessToken: 'Bearer fresh',
          refreshToken: 'refresh-fresh',
        })
      );
    }
    if ((options?.headers as Record<string, string>).authorization === 'Bearer fresh') {
      return Promise.resolve(Response.json({ success: true }));
    }
    return Promise.resolve(Response.json({ message: 'jwt expired' }, { status: 403 }));
  });
  await Promise.all([
    fetchWithRefresh('/first', { headers: { authorization: 'Bearer expired' } }),
    fetchWithRefresh('/second', { headers: { authorization: 'Bearer expired' } }),
  ]);
  expect(refreshRequests).toBe(1);
});
