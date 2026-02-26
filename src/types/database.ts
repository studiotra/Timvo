export type Client = {
  id: string;
  user_id: string;
  name: string;
  email: string | null;
  tax_id: string | null;
  currency: string;
  status?: "active" | "archived";
  address?: string | null;
  phone_number?: string | null;
  business_phone?: string | null;
  extension?: string | null;
  note?: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientListItem = Pick<
  Client,
  "id" | "name" | "email" | "tax_id" | "currency" | "address" | "phone_number" | "business_phone" | "extension" | "note"
> & { status?: "active" | "archived"; project_count: number };

export type Project = {
  id: string;
  client_id: string;
  name: string;
  hourly_rate: number | null;
  billing_type: "hourly" | "fixed";
  status: "active" | "archived";
  description: string | null;
  retainer_amount: number | null;
  retainer_hours: number | null;
  agreed_fee: number | null;
  estimated_hours: number | null;
  created_at: string;
  updated_at: string;
};

export type ProjectListItem = Pick<
  Project,
  "id" | "name" | "hourly_rate" | "billing_type" | "status" | "description" | "retainer_amount" | "retainer_hours" | "agreed_fee" | "estimated_hours"
>;

export type Service = {
  id: string;
  user_id: string;
  name: string;
  default_rate: number | null;
  billing_type: "hourly" | "fixed";
  created_at: string;
};

export type ServiceListItem = Pick<Service, "id" | "name" | "default_rate" | "billing_type">;
