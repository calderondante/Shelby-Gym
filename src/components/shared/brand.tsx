import Image from "next/image";
export function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className={large ? "brand brand-large" : "brand"}>
      <span className="brand-emblem">
        <Image
          src="/brand/shelby-reference.jpg"
          alt=""
          width={574}
          height={1280}
          priority
        />
      </span>
      <span className="brand-wordmark" translate="no">
        SHELBY<span>GYM</span>
      </span>
    </div>
  );
}
