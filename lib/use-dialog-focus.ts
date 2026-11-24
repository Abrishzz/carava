"use client"

import { useEffect, useRef } from "react"

const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function useDialogFocus(open: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return

    const dialog = dialogRef.current
    if (!dialog) return

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const getFocusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter((element) => element.getClientRects().length > 0)
    const focusable = getFocusable()
    ;(focusable[0] ?? dialog).focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== "Tab") return

      const elements = getFocusable()
      if (!elements.length) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      previousFocus?.focus()
    }
  }, [open])

  return dialogRef
}
