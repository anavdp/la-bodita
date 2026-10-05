import { Fragment } from "react";
import type { ReactNode } from "react";

/**
 * A translated sentence with some of its words set apart: "{date}" in the
 * template becomes whatever node is given for `date`. Keeps the whole sentence
 * in the catalogue, so each language orders its words its own way.
 */
export function emphasize(template: string, parts: Record<string, ReactNode>): ReactNode[] {
  return template.split(/(\{\w+\})/).map((piece, index) => {
    const name = piece.match(/^\{(\w+)\}$/)?.[1];
    return <Fragment key={index}>{name !== undefined && name in parts ? parts[name] : piece}</Fragment>;
  });
}
