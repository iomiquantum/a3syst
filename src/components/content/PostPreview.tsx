import { Facebook, Instagram, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, ThumbsUp, Share2, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  platform: "facebook" | "instagram";
  body: string;
  mediaUrls: string[];
  hashtags: string[];
  profileName?: string;
}

const PostPreview = ({ platform, body, mediaUrls, hashtags, profileName = "Mi Negocio" }: Props) => {
  const fullText = [body, hashtags.length > 0 ? "\n\n" + hashtags.join(" ") : ""].join("");

  if (platform === "instagram") {
    return (
      <div className="w-full max-w-[340px] bg-card border border-border rounded-xl overflow-hidden shadow-sm">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
            <span className="text-primary-foreground text-[10px] font-bold">MC</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">{profileName}</p>
            <p className="text-[10px] text-muted-foreground">Publicación</p>
          </div>
          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Media */}
        <div className="aspect-square bg-muted relative">
          {mediaUrls.length > 0 ? (
            <img src={mediaUrls[0]} alt="Preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Instagram className="w-12 h-12 text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <Heart className="w-5 h-5 text-foreground" />
              <MessageCircle className="w-5 h-5 text-foreground" />
              <Send className="w-5 h-5 text-foreground" />
            </div>
            <Bookmark className="w-5 h-5 text-foreground" />
          </div>
          <p className="text-xs font-semibold text-foreground mb-1">0 Me gusta</p>
          {fullText && (
            <p className="text-xs text-foreground leading-relaxed">
              <span className="font-semibold">{profileName}</span>{" "}
              <span className="whitespace-pre-wrap">{fullText.slice(0, 150)}{fullText.length > 150 ? "..." : ""}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // Facebook
  return (
    <div className="w-full max-w-[380px] bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 py-3">
        <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">MC</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{profileName}</p>
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <span>Justo ahora</span>
            <span>·</span>
            <Globe className="w-3 h-3" />
          </div>
        </div>
        <MoreHorizontal className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Body */}
      {fullText && (
        <div className="px-4 pb-2">
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
            {fullText.slice(0, 250)}{fullText.length > 250 ? "... Ver más" : ""}
          </p>
        </div>
      )}

      {/* Media */}
      {mediaUrls.length > 0 ? (
        <div className="aspect-video bg-muted">
          <img src={mediaUrls[0]} alt="Preview" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-video bg-muted flex items-center justify-center">
          <Facebook className="w-12 h-12 text-muted-foreground/30" />
        </div>
      )}

      {/* Reactions bar */}
      <div className="px-4 py-2 border-t border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground pb-2 border-b border-border">
          <span>0 reacciones</span>
          <span>0 comentarios · 0 compartidos</span>
        </div>
        <div className="flex items-center justify-around pt-1.5">
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-md transition-colors">
            <ThumbsUp className="w-4 h-4" /> <span className="text-sm font-medium">Me gusta</span>
          </button>
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-md transition-colors">
            <MessageCircle className="w-4 h-4" /> <span className="text-sm font-medium">Comentar</span>
          </button>
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground py-1.5 px-3 rounded-md transition-colors">
            <Share2 className="w-4 h-4" /> <span className="text-sm font-medium">Compartir</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostPreview;
