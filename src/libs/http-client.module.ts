type BodyInit =
  | ArrayBuffer
  | AsyncIterable<Uint8Array>
  | Blob
  | FormData
  | Iterable<Uint8Array>
  | NodeJS.ArrayBufferView
  | URLSearchParams
  | null
  | string;

type HeadersInit =
  | string[][]
  | Record<string, string | ReadonlyArray<string>>
  | Headers;

const request = async <TRESPONSE, TBODY extends BodyInit | undefined>(
  method: string,
  url: string,
  body?: TBODY,
  headers?: HeadersInit
): Promise<TRESPONSE> => {
  const response = await fetch(url, {
    method,
    body,
    headers,
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<TRESPONSE>;
};

const get = <TRESPONSE>(url: string, headers?: any) => {
  return request<TRESPONSE, null>("GET", url, undefined, headers);
};

const post = <TRESPONSE, TBODY extends BodyInit>(
  url: string,
  body: TBODY,
  headers?: any
) => {
  return request<TRESPONSE, TBODY>("POST", url, body, headers);
};

const put = <TRESPONSE, TBODY extends BodyInit>(
  url: string,
  body: any,
  headers?: any
) => {
  return request<TRESPONSE, TBODY>("PUT", url, body, headers);
};

const del = <TRESPONSE>(url: string, headers?: any) => {
  return request<TRESPONSE, null>("DELETE", url, undefined, headers);
};

export default { get, post, put, del };
