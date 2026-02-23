export type Client = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  tax_id: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
};

export type ClientListItem = Pick<
  Client,
  "id" | "name" | "email" | "tax_id" | "currency"
> & { project_count: number };

export type Project = {
  id: string;
  client_id: string;
  name: string;
  hourly_rate: number | null;
  billing_type: "hourly" | "fixed";
  status: "active" | "archived";
  created_at: string;
  updated_at: string;
};

export type ProjectListItem = Pick<
  Project,
  "id" | "name" | "hourly_rate" | "billing_type" | "status"
>;

export type Service = {
  id: string;
  user_id: string;
  name: string;
  default_rate: number | null;
  created_at: string;
};

export type ServiceListItem = Pick<Service, "id" | "name" | "default_rate">;
