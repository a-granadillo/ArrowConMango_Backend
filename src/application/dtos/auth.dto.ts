export interface RegisterInput {
  email: string;
  password: string;
  username: string;
}

export interface RegisterOutput {
  id: string;
  email: string;
  username: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginOutput {
  token: string;
}

export interface GuestLoginInput {
  uuid: string;
}

export interface GuestLoginOutput {
  token: string;
}
