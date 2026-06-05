import { useEffect } from "react";

export function useDirtyFormWarning(isDirty: boolean, message: string = "لديك تغييرات غير محفوظة. هل أنت متأكد أنك تريد المغادرة؟") {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // standard approach for modern browsers: e.returnValue must be set
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty, message]);
}
