import Image from "next/image";
export function Brand({ large = false }: { large?: boolean }) {
  return (
    <div className={large ? "brand brand-large" : "brand"}>
      <span className="brand-emblem">
        <Image
          src="/brand/app-192.png"
          alt=""
          width={192}
          height={192}
          sizes={large ? "70px" : "52px"}
          priority
        />
      </span>
      <span className="brand-wordmark" translate="no">
        SHELBY<span>GYM</span>
      </span>
    </div>
  );
}
