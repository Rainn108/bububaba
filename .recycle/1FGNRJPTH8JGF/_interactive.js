global.api = {
    xterm: {
        key: "Bell409",
        url: "https://ai.xterm.codes"
    }
}
import { pipeline } from 'stream';
import { promisify } from 'util';
import fs from 'fs';
import fetch from 'node-fetch';
const streamPipeline = promisify(pipeline);
import { getContentType, downloadContentFromMessage } from "@adiwajshing/baileys";

const download = async (message, MessageType = "image") => {
    const stream = await downloadContentFromMessage(message, MessageType);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
    }
    return buffer;
};

let t = {
    2: {
        n: "Bella",
        fn: "Bella Clarissa",
        v: "bella?"
    }
};

export async function before(m, { isAdmin, isBotAdmin }) {
    if (m.isBaileys && m.fromMe) return;
    let type = await getContentType(m.message);
    const _isImage = type == "imageMessage" ? await download(m.message[type], "image") : false;
    const isQuotedImage = m.quoted && m.quoted.mtype == "imageMessage" ? await m.quoted.download() : false;
    const isImage = _isImage || isQuotedImage;
    let z = global.db.data.users[m.sender]?.typeaichat || 2;
    let a = t[z];
    
    if (m.text.startsWith('.') || m.text.startsWith('#') || m.text.startsWith('!') || m.text.startsWith('/')) return;
    
    let mentions = m?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0
        ? m?.message?.extendedTextMessage?.contextInfo?.mentionedJid
        : m?.message?.extendedTextMessage?.contextInfo?.participant
            ? [m?.message?.extendedTextMessage?.contextInfo?.participant]
            : [];
    let isBotMention = mentions.includes(this.user.jid);

    if (global.ai_interactive.includes(m.chat) && m.text && isBotMention || global.ai_interactive.includes(m.chat) && m.text && m.text.startsWith(a.n)) {
        try {
            let body = {
                text: `${m.text}`,
                id: m.sender,
                fullainame: a.fn,
                nickainame: a.n,
                senderName: m.pushName,
                ownerName: `${global.namebot}`,
                date: new Date(),
                role: "pacar",
                image: isImage
            };

            let res = await fetch(`${api.xterm.url}/api/chat/logic-bell?key=${api.xterm.key}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            let { data } = await res.json();
            console.log(data);
            let tryng = 0;

            // Periksa jika ada cmd di respons
            if (data?.cmd) {
                // Jika cmd bukan 'voice', kirim pesan teks
                if (data.cmd !== "voice") {
                    await m.reply(data.msg);
                }

                // Menangani berbagai command
                switch (data.cmd) {
                    case 'ytm4a':
                        let search = (await fetch(api.xterm.url + "/api/search/youtube?query=" + data.cfg.url + "&key=" + api.xterm.key).then(a => a.json())).data;
                        await m.reply("Downloading...");
                        let ddata = (await fetch(api.xterm.url + "/api/downloader/youtube?url=" + data.cfg.url + "&type=" + (data.cmd === "ytmp4" ? "mp4" : "mp3") + "&key=" + api.xterm.key).then(a => a.json())).data;
                        let item = search.items[0];
                        
                        let audio = {
                            [data.cmd === "ytmp4" ? "video" : "audio"]: { url: ddata.dlink },
                            mimetype: data.cmd === "ytmp4" ? "video/mp4" : "audio/mpeg",
                            fileName: item.title + (data.cmd === "ytmp4" ? ".mp4" : ".mp3"),
                            ptt: data.cmd === "play",
                            contextInfo: {
                                externalAdReply: {
                                    title: "Title: " + item.title,
                                    body: "Channel: " + item.creator,
                                    thumbnailUrl: item.thumbnail,
                                    sourceUrl: item.url,
                                    mediaUrl: "http://ẉa.me/6283110928302?text=Idmsg: " + Math.floor(Math.random() * 100000000000000000),
                                    renderLargerThumbnail: false,
                                    showAdAttribution: true,
                                    mediaType: 2,
                                },
                            },
                        };
                        await this.sendMessage(m.chat, audio, { quoted: m });
                        break;

                    case "pinterest":
                        await this.sendMessage(m.chat, { image: { url: "https://rifza.me/api/pinterest-v2?query=" + data.cfg.query } }, { quoted: m });
                        break;

                    case "voice":
                        let tryng = 0;
                        while (true) {
                            try {
                                await this.sendPresenceUpdate('recording', m.chat);
                                await this.sendMessage(m.chat, { audio: { url: `${api.xterm.url}/api/text2speech/${a.v}key=${api.xterm.key}&text=${data.msg}` }, mimetype: "audio/mpeg", ptt: true }, { quoted: m });
                                break;
                            } catch (e) {
                                tryng++;
                                if (tryng >= 10) {
                                    console.log(e);
                                    m.reply("Maaf Ya Aku Gak Jadi Vn Buat Kamu Hehehe:)");
                                    break;
                                }
                            }
                        }
                        break;

                    case "opengroup":
                    case "closegroup":
                        if (!m.isGroup) return m.reply("Ini bukan di grup!");
                        if (!isAdmin) return m.reply("Kamu bukan admin!");
                        if (!isBotAdmin) return m.reply("Aku bukan admin!");
                        let isClose = {
                            'opengroup': 'not_announcement',
                            'closegroup': 'announcement',
                        }[(data.cmd || '')];
                        await this.groupSettingUpdate(m.chat, isClose);
                        break;

                    case "tiktok":
                        try {
                            let anu = await fetch(`https://rifza.me/api/tiktok-v1/downloader?link=${data.cfg.url}`);
                            let _data = await anu.json();
                            let type = _data.type;
                            if (type == 'image') {
                                let images = _data.media;
                                for (let N = 0; N < images.length; N++) {
                                    await this.sendMessage(m.chat, { image: { url: images[N].url } }, { quoted: m });
                                }
                            }
                            if (type == 'video') {
                                let video = _data.media[1];
                                await this.sendMessage(m.chat, { video: { url: video.url } }, { quoted: m });
                            }
                        } catch (e) {
                            console.log(e);
                            m.reply(e);
                        }
                        break;
                }
            } else {
                // Jika tidak ada cmd, kirim pesan teks biasa
                if (data?.msg) {
                    await m.reply(data.msg);
                }
            }
        } catch (e) {
            console.log(e);
            throw 'Maaf aku tidak mengerti';
        }
    }
    return;
}