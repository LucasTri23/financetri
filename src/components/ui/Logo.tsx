import Image from "next/image";

export function Logo({ tamanho = 42 }: { tamanho?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-[13px] bg-gradient-to-br from-azul-claro to-azul-escuro"
      style={{ width: tamanho, height: tamanho }}
    >
      <Image
        src="/logo.png"
        alt="ControleFácil"
        width={tamanho}
        height={tamanho}
        className="h-full w-full object-cover"
        onError={() => {}}
        priority
      />
    </span>
  );
}
