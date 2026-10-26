import "@/styles/globals.css";
import Head from "next/head";
import { sans } from "@/lib/fonts";

export default function App({ Component, pageProps }) {
  return (
    <div className={`${sans.className} antialiased`}>
      <Head>
        <title>AI Land Finder</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </div>
  );
}
