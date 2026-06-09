"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Tema = "claro" | "escuro";

const ContextoTema = createContext<{ tema: Tema; alternarTema: () => void }>({
  tema: "claro",
  alternarTema: () => {},
});

export function useTheme() {
  return useContext(ContextoTema);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>("claro");

  useEffect(() => {
    const salvo = localStorage.getItem("tema") as Tema | null;
    if (salvo === "escuro") {
      setTema("escuro");
    }
  }, []);

  useEffect(() => {
    if (tema === "escuro") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("tema", tema);
  }, [tema]);

  const alternarTema = useCallback(() => {
    setTema((t) => (t === "claro" ? "escuro" : "claro"));
  }, []);

  return (
    <ContextoTema.Provider value={{ tema, alternarTema }}>
      {children}
    </ContextoTema.Provider>
  );
}
