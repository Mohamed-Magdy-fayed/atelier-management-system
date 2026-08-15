import type z from "zod";

import type { OAuthProvider, User } from "@/drizzle/schema";
import type { ScreenPermissionMap } from "@/features/core/auth/core/screen-permission-map";
import type { FullBranch } from "@/features/core/auth/nextjs/actions";
import type {
  createBranchSchema,
  sessionSchema,
  signInSchema,
  signUpSchema,
} from "./schemas";

export type SessionPayload = z.infer<typeof sessionSchema>;
export type SessionUser = z.infer<typeof sessionSchema>["user"];

/**
 * The session's user, plus this user's explicit screen grants when the caller
 * was able to load them.
 *
 * `screenPermissions` is optional because not every producer can reach the
 * database (the proxy reads a Redis mirror and may miss). Absent means "unknown"
 * and the permission engine falls back to role defaults — see
 * `ScreenPermissionMap`.
 */
export type PartialUser = SessionUser & {
  screenPermissions?: ScreenPermissionMap | null;
};

export type AuthUser = User & {
  screenPermissions?: ScreenPermissionMap | null;
};

export type AuthState =
  | {
      isAuthenticated: false;
      session: null;
    }
  | {
      isAuthenticated: true;
      session: { user: AuthUser; hasPassword: boolean };
    };
export type BranchState =
  | {
      hasActiveOrg: false;
      activeBranch: undefined;
      branches: FullBranch[];
      /** True when the user is assigned to every branch (may use “all branches” view). */
      canViewAllBranches: boolean;
    }
  | {
      hasActiveOrg: true;
      activeBranch: FullBranch;
      branches: FullBranch[];
      canViewAllBranches: boolean;
    };

export type Cookies = {
  set: (
    key: string,
    value: string,
    options: {
      secure?: boolean;
      httpOnly?: boolean;
      sameSite?: "strict" | "lax";
      expires?: Date;
      path?: string;
    },
  ) => void;
  get: (key: string) => { name: string; value: string } | undefined;
  delete: (key: string) => void;
};

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;

export type SendEmailVerificationEmail = (options: {
  to: string;
  name?: string | null;
  verificationUrl: string;
}) => Promise<void>;
export type SendEmailChangeVerificationEmail = (options: {
  to: string;
  name?: string | null;
  verificationUrl: string;
  currentEmail: string;
}) => Promise<void>;

export type SendPasswordResetOtpEmail = (options: {
  to: string;
  name?: string | null;
  code: string;
  expiresInMinutes: number;
}) => Promise<void>;
export type RequestPasswordResetInput = {
  email: string;
};
export type ResetPasswordInput = {
  email: string;
  otp: string;
  newPassword: string;
};

export type OAuthConnection = {
  provider: OAuthProvider;
  displayName: string;
  connected: boolean;
  connectedAt: Date | null;
};

export type CreateBranchInput = z.infer<typeof createBranchSchema>;
export type UpdateProfileInput = {
  userId: string;
  name: string;
};
export type ChangePasswordInput = {
  userId: string;
  currentPassword: string;
  newPassword: string;
};
export type CreatePasswordInput = {
  userId: string;
  newPassword: string;
};

type ErrorResponse = {
  isError: true;
  message: string;
};
type SuccessResponse<T> = {
  isError: false;
} & T;

export type TypedResponse<T> = ErrorResponse | SuccessResponse<T>;

export type PasskeyListItem = {
  id: string;
  label: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  isBackupEligible: boolean;
  isBackupState: boolean;
  transports: string[];
};
export type RegistrationOptionsResult =
  | { isError: false; options: PublicKeyCredentialCreationOptionsJSON }
  | { isError: true; message: string };
export type AuthenticationOptionsResult =
  | {
      isError: false;
      options: PublicKeyCredentialRequestOptionsJSON;
      email: string | null;
    }
  | { isError: true; message: string };
