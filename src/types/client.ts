export type PublicClient = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
};

export type CreateClientInput = {
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type UpdateClientInput = {
  name?: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  active?: boolean;
};

export function toPublicClient(client: {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
}): PublicClient {
  return {
    id: client.id,
    name: client.name,
    document: client.document,
    email: client.email,
    phone: client.phone,
    active: client.active,
  };
}
