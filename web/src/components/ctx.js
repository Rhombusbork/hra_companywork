import { createContext, useContext } from "react";

// 화면 어디서나 쓰는 값: D(데이터) P(설정) L(규칙) 과 동작들
export const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);
