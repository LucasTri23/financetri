import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-fundo px-6 text-center">
      <span className="rounded-full bg-azul-suave px-4 py-1 text-sm font-semibold text-azul-texto">
        Controle Financeiro
      </span>
      <h1 className="max-w-xl text-4xl font-extrabold tracking-tight text-texto sm:text-5xl">
        Organize suas dívidas, saídas e entradas em um só lugar
      </h1>
      <p className="max-w-md text-base text-cinza">
        Importe faturas, cadastre gastos e receitas, e acompanhe tudo junto com
        quem você divide as contas.
      </p>
      <Link
        href="/login"
        className="rounded-full bg-azul px-6 py-3 font-semibold text-white shadow-cartao transition hover:bg-azul-texto"
      >
        Entrar
      </Link>
    </div>
  );
}
