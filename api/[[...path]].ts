import handler from '../server';

type ApiRequest = Parameters<typeof handler>[0];
type ApiResponse = Parameters<typeof handler>[1];

export default async function apiHandler(req: ApiRequest, res: ApiResponse) {
  return handler(req, res);
}
