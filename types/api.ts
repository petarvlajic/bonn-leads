export interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

export interface PaginationMeta {
  current_page: number;
  first_page_url: string;
  from: number;
  last_page: number;
  last_page_url: string;
  links: PaginationLink[];
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number;
  total: number;
}

// Generic API response type
export interface ApiResponse<T> {
  ok: boolean;
  statusCode: number;
  result: {
    message: string;
    data: T extends any[] ? PaginationMeta & { data: T; errors?: string } : T;
  };
}
