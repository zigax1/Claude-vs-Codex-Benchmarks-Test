export interface PublicUser {
  id: number;
  email: string;
  name: string;
}

export interface UserWithPassword extends PublicUser {
  password_hash: string;
}

export interface UserProfile extends PublicUser {
  created_at: Date;
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  created_at: Date;
}

export interface ProjectWithOwner extends Project {
  owner_id: number;
}

export interface ProjectOwner {
  owner_id: number;
}
