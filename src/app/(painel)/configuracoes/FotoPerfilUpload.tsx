"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { uploadFotoPerfil } from "./actions";

export function FotoPerfilUpload({
  fotoAtual,
  inicial,
}: {
  fotoAtual: string | null;
  inicial: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [fotoSalva, setFotoSalva] = useState<string | null>(fotoAtual);
  const [pending, startTransition] = useTransition();

  const fotoExibida = preview ?? fotoSalva;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setErro(null);
    setSucesso(false);

    if (!file.type.startsWith("image/")) {
      setErro("Selecione uma imagem (JPG, PNG, WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErro("Foto muito grande (máx. 5 MB).");
      return;
    }

    setArquivo(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function cancelar() {
    setPreview(null);
    setArquivo(null);
    setErro(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function salvar() {
    if (!arquivo) return;
    const formData = new FormData();
    formData.append("foto", arquivo);

    startTransition(async () => {
      const result = await uploadFotoPerfil(formData);
      if (result?.erro) {
        setErro(result.erro);
      } else {
        setSucesso(true);
        if (result?.url) setFotoSalva(result.url);
        setPreview(null);
        setArquivo(null);
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  }

  return (
    <div className="flex items-center gap-5 px-6 py-5">
      {/* Avatar clicável */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full ring-2 ring-borda transition hover:ring-azul focus-visible:outline-none focus-visible:ring-azul"
      >
        {fotoExibida ? (
          <Image
            src={fotoExibida}
            alt="Foto de perfil"
            fill
            sizes="80px"
            className="object-cover"
            unoptimized={fotoExibida.startsWith("data:")}
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-azul-claro to-azul text-2xl font-extrabold text-white">
            {inicial}
          </span>
        )}
        {/* Overlay hover */}
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/50 opacity-0 transition group-hover:opacity-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          <span className="text-[10px] font-bold text-white">Trocar</span>
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="sr-only"
      />

      {/* Ações */}
      <div className="flex flex-1 flex-col gap-2">
        {preview ? (
          <>
            <p className="text-sm text-cinza">Foto selecionada. Confirme para salvar.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={salvar}
                disabled={pending}
                className="rounded-xl bg-gradient-to-r from-azul-claro to-azul-escuro px-4 py-2 text-sm font-bold text-white shadow transition hover:opacity-90 disabled:opacity-50"
              >
                {pending ? "Enviando…" : "Salvar foto"}
              </button>
              <button
                type="button"
                onClick={cancelar}
                disabled={pending}
                className="rounded-xl border border-borda px-4 py-2 text-sm font-semibold text-cinza transition hover:bg-fundo"
              >
                Cancelar
              </button>
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="w-fit rounded-xl border border-borda bg-cartao px-4 py-2 text-sm font-semibold text-texto transition hover:bg-azul-suave"
            >
              {fotoSalva ? "Trocar foto" : "Adicionar foto"}
            </button>
            <p className="text-xs text-cinza">JPG, PNG ou WebP — máx. 5 MB</p>
          </>
        )}

        {erro && <p className="text-xs text-vermelho-texto">{erro}</p>}
        {sucesso && <p className="text-xs text-verde-texto">✓ Foto atualizada!</p>}
      </div>
    </div>
  );
}
