import type { ReactNode } from "react";
import { ScrollViewStyleReset, useServerDocumentContext } from "expo-router/html";

/**
 * Root HTML for every web page (Expo's default plus the site title). Since SDK 58, titles set with expo-router/head
 * appear only after the app loads, so this one is what shared links and the first paint show. Runs in Node only.
 */
export default function Root({ children }: { children: ReactNode }) {
  const { bodyAttributes, bodyNodes, htmlAttributes, headNodes } = useServerDocumentContext();
  return (
    <html lang="en" {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <title>QuinTaste</title>
        <meta name="description" content="Vegan and vegetarian places, recipes and community in Singapore." />
        <ScrollViewStyleReset />
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
