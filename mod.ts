
import { Page } from "./page.ts";
import { Widgets } from "./widgets.ts"
import { join, fromFileUrl } from "jsr:@std/path@0.223.0";

export { Page, Widgets }

const baseUrl = new URL(".", import.meta.url);
let indexHtmlTemplate: string;
if (baseUrl.protocol === "file:") {
    const __dirname = fromFileUrl(baseUrl);
    const filePath = join(__dirname, "assets", "index.html.template");
    const decoder = new TextDecoder("utf-8");
    indexHtmlTemplate = decoder.decode(await Deno.readFile(filePath));
} else {
    const response = await fetch(new URL("assets/index.html.template", import.meta.url).href);
    indexHtmlTemplate = await response.text();
}

export const handleRequest = async (req: Request, pageTitle: string, pageCallback: (page: Page) => Promise<void>): Promise<Response> => {
    const url = new URL(req.url);
    if (url.searchParams.get("app") === "index") {
        return wsHandler(req, pageCallback);
    } else {
        const indexHtmlContent = indexHtmlTemplate.replace("__SMOOTHIE_UI__PAGE_TITLE__", pageTitle);
        return new Promise((resolve, reject) => {
            resolve(new Response(indexHtmlContent, {
                status: 200,
                headers: {
                    "content-type": "text/html; charset=utf-8",
                },
            }));
        });

    }
}





async function wsHandler(req: Request, pageCallback: (page: Page) => Promise<void>): Promise<Response> {
    const { response, socket } = Deno.upgradeWebSocket(req);
    const page = new Page(socket);
    socket.onopen = async () => {
        console.log("WebSocket connection opened");
        await pageCallback(page); // This will access the correct socket // catch errors / needs to be tested
        socket.close();
        console.log("Page closed!");
    };

    socket.onclose = () => {
        console.log("WebSocket connection closed");
    };

    socket.onerror = (err) => {
        console.error("WebSocket error:", err);
    };

    return response;
}

