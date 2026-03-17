import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMetaAppConfig } from "@/hooks/useMetaAppConfig";
import { useBusiness } from "@/hooks/useBusiness";
import { toast } from "sonner";

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export interface FacebookPage {
  page_id: string;
  page_name: string;
  page_access_token: string;
  page_picture: string | null;
  instagram: {
    id: string;
    username: string;
    profile_picture_url?: string;
  } | null;
}

export const useFacebookAuth = () => {
  const { businessId } = useBusiness();
  const metaConfig = useMetaAppConfig();
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getAppId = useCallback(() => {
    if (metaConfig.currentMode === "custom" && metaConfig.config?.custom_app_id) {
      return metaConfig.config.custom_app_id;
    }
    return metaConfig.config?.shared_app_id || "850630404695074";
  }, [metaConfig]);

  const loadFacebookSDK = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (window.FB) {
        window.FB.init({
          appId: getAppId(),
          cookie: true,
          xfbml: false,
          version: "v21.0",
        });
        resolve();
        return;
      }

      window.fbAsyncInit = function () {
        window.FB.init({
          appId: getAppId(),
          cookie: true,
          xfbml: false,
          version: "v21.0",
        });
        resolve();
      };

      // Remove existing SDK script if any (in case app ID changed)
      const existing = document.getElementById("facebook-jssdk");
      if (existing) existing.remove();

      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/es_LA/sdk.js";
      script.async = true;
      script.onerror = () => reject(new Error("No se pudo cargar el SDK de Facebook"));
      document.body.appendChild(script);

      // Timeout after 15s
      setTimeout(() => reject(new Error("Tiempo de espera agotado cargando Facebook")), 15000);
    });
  }, [getAppId]);

  const loginWithFacebook = useCallback(async (): Promise<FacebookPage[]> => {
    setLoading(true);
    setError(null);
    setPages([]);

    try {
      await loadFacebookSDK();

      // Step 1: FB Login popup
      const accessToken: string = await new Promise((resolve, reject) => {
        window.FB.login(
          (response: any) => {
            if (response.authResponse) {
              resolve(response.authResponse.accessToken);
            } else {
              reject(new Error("Autorización cancelada por el usuario"));
            }
          },
          {
            scope:
              "pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish",
          }
        );
      });

      // Step 2: Send to edge function to exchange token and get pages
      const { data, error: fnError } = await supabase.functions.invoke(
        "exchange-facebook-token",
        {
          body: { shortLivedToken: accessToken, businessId },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || "Error al procesar la conexión");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const fetchedPages: FacebookPage[] = data?.pages || [];
      if (fetchedPages.length === 0) {
        throw new Error("No se encontraron páginas de Facebook asociadas a tu cuenta.");
      }

      setPages(fetchedPages);
      setLoading(false);
      return fetchedPages;
    } catch (err: any) {
      const msg = err.message || "Error al conectar con Facebook";
      setError(msg);
      setLoading(false);
      toast.error(msg);
      return [];
    }
  }, [loadFacebookSDK, businessId]);

  const reset = useCallback(() => {
    setPages([]);
    setError(null);
    setLoading(false);
  }, []);

  return {
    loading,
    pages,
    error,
    loginWithFacebook,
    reset,
    getAppId,
  };
};
