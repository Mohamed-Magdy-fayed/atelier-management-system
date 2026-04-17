import Image from "next/image";
import type { OAuthProvider } from "@/features/core/auth/tables";

export function useOauthProviderIcon() {
    return function getProviderIcon(provider: OAuthProvider) {
        switch (provider) {
            case "github":
                return (
                    <Image
                        alt="github"
                        height={24}
                        src="https://cdn.brandfetch.io/idZAyF9rlg/theme/light/symbol.svg?c=1bxid64Mup7aczewSAYMX&t=1719469980739"
                        style={{ height: "auto" }}
                        width={24}
                    />
                );
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
