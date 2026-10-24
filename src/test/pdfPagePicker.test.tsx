import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PdfPagePicker } from "@/components/upload/PdfPagePicker";

const { loadPdf } = vi.hoisted(() => ({ loadPdf: vi.fn() }));
vi.mock("pdf-lib", () => ({ PDFDocument: { load: loadPdf } }));

function fixture(name: string) {
  const file = new File(["PDF fixture"], name, { type: "application/pdf" });
  Object.defineProperty(file, "arrayBuffer", { value: async () => new ArrayBuffer(1) });
  return file;
}

describe("Selezione pagine PDF", () => {
  beforeEach(() => { loadPdf.mockReset(); });

  it("recupera da un errore temporaneo e mantiene utilizzabili le checkbox", async () => {
    loadPdf.mockRejectedValueOnce(new Error("offline"));
    loadPdf.mockResolvedValue({ getPageCount: () => 2 });
    const onChange = vi.fn();
    render(<PdfPagePicker file={fixture("appunti.pdf")} disabled={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Scegli le pagine da studiare" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Riprova" }));
    const firstPage = await screen.findByRole("checkbox", { name: "1" });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    fireEvent.click(firstPage);
    expect(onChange).toHaveBeenCalledWith([2]);
    expect(loadPdf).toHaveBeenCalledTimes(2);
  });

  it("ricalcola il numero di pagine quando cambia il file senza rimontare il selettore", async () => {
    loadPdf.mockResolvedValueOnce({ getPageCount: () => 2 });
    loadPdf.mockResolvedValue({ getPageCount: () => 3 });
    const props = { disabled: false, onChange: vi.fn() };
    const view = render(<PdfPagePicker {...props} file={fixture("prima.pdf")} />);
    fireEvent.click(screen.getByRole("button", { name: "Scegli le pagine da studiare" }));
    await waitFor(() => expect(screen.getAllByRole("checkbox")).toHaveLength(2));
    view.rerender(<PdfPagePicker {...props} file={fixture("seconda.pdf")} />);
    expect(await screen.findByRole("checkbox", { name: "3" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox")).toHaveLength(3);
  });
});
