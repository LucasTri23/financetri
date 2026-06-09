import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function TabelaTransacoes({
  colunas,
  children,
}: {
  colunas: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {colunas.map((coluna) => (
              <th
                key={coluna}
                className="bg-azul-suave px-3.5 py-2.5 text-left text-[0.73rem] font-bold uppercase tracking-widest text-azul-texto first:rounded-tl-xl last:rounded-tr-xl"
              >
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function LinhaTabela({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      className={cn(
        "border-b border-borda last:border-b-0 transition-colors duration-100",
        className,
      )}
      {...props}
    />
  );
}

export function CelulaTabela({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-3.5 py-2.5 text-texto", className)} {...props} />;
}
