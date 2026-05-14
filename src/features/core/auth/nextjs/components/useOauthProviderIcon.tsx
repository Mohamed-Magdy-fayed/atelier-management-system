import Image from "next/image";
import type { OAuthProvider } from "@/drizzle/schema";

export function useOauthProviderIcon() {
  return function getProviderIcon(provider: OAuthProvider) {
    switch (provider) {
      case "google":
        return (
          <Image
            alt="Google"
            height={24}
            src="https://cdn.brandfetch.io/id6O2oGzv-/theme/dark/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1755835725776"
            style={{ height: "auto" }}
            width={24}
          />
        );
      default:
        return null;
    }
  };
}
