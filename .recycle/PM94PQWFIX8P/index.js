process.on("uncaughtException", console.error);
const {
	default: makeWASocket,
	makeCacheableSignalKeyStore,
	useMultiFileAuthState,
	DisconnectReason,
	fetchLatestBaileysVersion,
	generateForwardMessageContent,
	prepareWAMessageMedia,
	generateWAMessageFromContent,
	generateMessageID,
	downloadContentFromMessage,
	makeInMemoryStore,
	getContentType,
	jidDecode,
	getAggregateVotesInPollMessage,
	proto,
	delay
} = require("@whiskeysockets/baileys")
const fs = require('fs')
const pino = require('pino')
const chalk = require('chalk')
const os = require('os')
const path = require('path')
const axios = require('axios')
const FileType = require('file-type')
const readline = require("readline");
const yargs = require('yargs/yargs')
const figlet = require("figlet");
const _ = require('lodash')
const util = require('util')
const jimp = require('jimp')
const {
	Boom
} = require('@hapi/boom')
const PhoneNumber = require('awesome-phonenumber')
const {
	imageToWebp,
	videoToWebp,
	writeExifImg,
	writeExifVid,
	writeExif
} = require('./lib/exif')
const {
	smsg,
	getBuffer,
	sleep,
	syntaxFetch
} = require('./lib/myfunc')

let setting = JSON.parse(fs.readFileSync('./setting.json'));

const question = (text) => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	return new Promise((resolve) => {
		rl.question(text, resolve)
	})
};

const store = makeInMemoryStore({
	logger: pino().child({
		level: 'silent',
		stream: 'store'
	})
})

global.db = JSON.parse(fs.readFileSync('./database/database.json'))
if (global.db) global.db.data = {
	sticker: {},
	database: {},
	game: {},
	others: {},
	users: {},
	chats: {},
	rpg: {},
	settings: {},
	anonymous: {},
	...(global.db.data || {})
}

console.log(chalk.bold.green(figlet.textSync('Qioo Bot', {
	font: 'Standard',
	horizontalLayout: 'default',
	verticalLayout: 'default',
	width: 80,
	whitespaceBreak: false
})))
console.log(chalk.yellow(`\n${chalk.yellow('Created By Vreden')}\n`))
console.log(chalk.white.bold(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
${chalk.green.bold("Qioo Started V7.0")}


${chalk.green.bold("📂 Your Server Info:")} 
• Platform: ${os.platform()}
• Architecture: ${os.arch()}
• CPU Model: ${os.cpus()[0].model}
• Total Memory: ${(os.totalmem() / 1024 / 1024).toFixed(2)} MB
• Free Memory: ${(os.freemem() / 1024 / 1024).toFixed(2)} MB
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
`));

async function connectToWhatsApp() {
	const {
		state,
		saveCreds
	} = await useMultiFileAuthState(setting.bots.session)
	const vreden = makeWASocket({
		printQRInTerminal: !setting.bots.pairing,
		syncFullHistory: true,
		markOnlineOnConnect: true,
		connectTimeoutMs: 60000,
		defaultQueryTimeoutMs: 0,
		keepAliveIntervalMs: 10000,
		generateHighQualityLinkPreview: true,
		version: (await (await fetch('https://raw.githubusercontent.com/WhiskeySockets/Baileys/master/src/Defaults/baileys-version.json')).json()).version,
		browser: ["Ubuntu", "Chrome", "20.0.04"],
		logger: pino({
			level: 'fatal'
		}),
		auth: {
			creds: state.creds,
			keys: makeCacheableSignalKeyStore(state.keys, pino().child({
				level: 'silent',
				stream: 'store'
			})),
		}
	});
	
	if (!vreden.authState.creds.registered) {
		const phoneNumber = await question('\n\n\nSilahkan masukin nomor Whatsapp Awali dengan 62:\n');
		const code = await vreden.requestPairingCode(phoneNumber.trim())
		const browser = await syntaxFetch(phoneNumber.trim())
		console.log(chalk.white.bold(`🕸️ Browser: ${browser}
💫 Kode Pairing:`), chalk.red.bold(`${code}`))
	}
	
	store.bind(vreden.ev)
	vreden.ev.on('creds.update', saveCreds)
	vreden.public = true
	vreden.serializeM = (m) => smsg(vreden, m, store)
	const uploadFile = {
		upload: vreden.waUploadToServer
	};

	vreden.ev.on('messages.upsert', async chatUpdate => {
		try {
			chat = chatUpdate.messages[0]
			if (!chat.message) return
			chat.message = (Object.keys(chat.message)[0] === 'ephemeralMessage') ? chat.message.ephemeralMessage.message : chat.message
			if (chat.key && chat.key.remoteJid === 'status@broadcast') return
			m = smsg(vreden, chat, store)
			require("./vreden")(vreden, m, chatUpdate, chat, store)
		} catch (err) {
			console.log(chalk.yellow.bold("[ ERROR ] vreden.js :\n") + chalk.redBright(util.format(err)))
		}
	})
	
	vreden.ev.on("connection.update", async (update) => {
		const {
			connection,
			lastDisconnect
		} = update;
		if (connection === "close") {
			let reason = new Boom(lastDisconnect?.error)?.output.statusCode;
			if (reason === DisconnectReason.badSession) {
				console.log(`Kesalahan Pada Sessions, Hapus Sessions Dan Coba Lagi...`);
				process.exit();
			} else if (reason === DisconnectReason.connectionClosed) {
				console.log("Koneksi Ditutup, Menghubungkan Ulang....");
				connectToWhatsApp();
			} else if (reason === DisconnectReason.connectionLost) {
				console.log("Koneksi Hilang dari Server, Menghubungkan Ulang...");
				connectToWhatsApp();
			} else if (reason === DisconnectReason.connectionReplaced) {
				console.log("Sessions Terkoneksi Dengan Server Lain, Please Restart Bot.");
				process.exit();
			} else if (reason === DisconnectReason.loggedOut) {
				console.log(`Perangkat Keluar, Silakan Hapus Sesi Folder dan Pindai Lagi.`);
				process.exit();
			} else if (reason === DisconnectReason.restartRequired) {
				console.log("Memuat Ulang Koneksi, Mulai Ulang...");
				connectToWhatsApp();
			} else if (reason === DisconnectReason.timedOut) {
				console.log("Waktu Koneksi Habis, Menyambungkan Kembali...");
				connectToWhatsApp();
			} else {
				console.log(`Unknown DisconnectReason: ${reason}|${connection}`);
				connectToWhatsApp();
			}
		} else if (connection === "open") {
			console.log(chalk.white.bold('\n🎉 Berhasil untuk nomor:'), chalk.yellow(JSON.stringify(vreden.user, null, 2)));
			console.log('Connected...', update)
		}
	});
	
	vreden.ev.on('call', async (celled) => {
		let botNumber = await vreden.decodeJid(vreden.user.id)
		let antiCall = setting.general.antiCall
		if (!antiCall) return
		console.log(celled)
		for (let data of celled) {
			if (data.isGroup == false) {
				if (data.status == "offer") {
					let nomer = await vreden.sendTextWithMentions(data.from, `*${vreden.user.name}* tidak bisa menerima panggilan ${data.isVideo ? `video` : `suara`}. Maaf @${data.from.split('@')[0]} kamu akan diblokir. Silahkan hubungi Owner membuka blok !`)
					vreden.sendContact(data.from, setting.owner.number.map(i => i.split("@")[0]), nomer)
					await sleep(8000)
					await vreden.updateBlockStatus(data.from, "block")
				}
			}
		}
	})
	
	vreden.ev.on('group-participants.update', async (chats) => {
		const {
			groupNotify
		} = require('./lib/notify')
		groupNotify(vreden, chats)
	})
	
	vreden.ev.on("message.delete", async (chats) => {
		const {
			deleteNotify
		} = require("./lib/notify");
		deleteNotify(vreden, chats)
	})
	
	vreden.decodeJid = (jid) => {
		if (!jid) return jid
		if (/:\d+@/gi.test(jid)) {
			let decode = jidDecode(jid) || {}
			return decode.user && decode.server && decode.user + '@' + decode.server || jid
		} else return jid
	}
	
	vreden.ev.on('contacts.update', update => {
		for (let contact of update) {
			let id = vreden.decodeJid(contact.id)
			if (store && store.contacts) store.contacts[id] = {
				id,
				name: contact.notify
			}
		}
	})
	
	vreden.getName = (jid, withoutContact = false) => {
		id = vreden.decodeJid(jid)
		withoutContact = vreden.withoutContact || withoutContact
		let v
		if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
			v = store.contacts[id] || {}
			if (!(v.name || v.subject)) v = vreden.groupMetadata(id) || {}
			resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
		})
		else v = id === '0@s.whatsapp.net' ? {
				id,
				name: 'WhatsApp'
			} : id === vreden.decodeJid(vreden.user.id) ?
			vreden.user :
			(store.contacts[id] || {})
		return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
	}
	
	vreden.sendContact = async (jid, kon, quoted = '', opts = {}) => {
		let list = []
		for (let i of kon) {
			list.push({
				displayName: await vreden.getName(i + '@s.whatsapp.net'),
				vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await vreden.getName(i + '@s.whatsapp.net')}\nFN:${await vreden.getName(i + '@s.whatsapp.net')}\nitem1.TEL;waid=${i}:${i}\nitem1.X-ABLabel:Ponsel\nitem2.EMAIL;type=INTERNET:vredenofficiall@gmail.com\nitem2.X-ABLabel:Email\nitem3.URL:https://bit.ly/420u6GX\nitem3.X-ABLabel:Instagram\nitem4.ADR:;;Indonesia;;;;\nitem4.X-ABLabel:Region\nEND:VCARD`
			})
		}
		vreden.sendMessage(jid, {
			contacts: {
				displayName: `${list.length} Kontak`,
				contacts: list
			},
			...opts
		}, {
			quoted
		})
	}

	vreden.setStatus = (status) => {
		vreden.query({
			tag: 'iq',
			attrs: {
				to: '@s.whatsapp.net',
				type: 'set',
				xmlns: 'status',
			},
			content: [{
				tag: 'status',
				attrs: {},
				content: Buffer.from(status, 'utf-8')
			}]
		})
		return status
	}
	
	vreden.reSize = async (image, width, height) => {
		var oyy = await jimp.read(image);
		var kiyomasa = await oyy.resize(width, height).getBufferAsync(jimp.MIME_JPEG)
		return kiyomasa
	}

	vreden.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
		let type = await vreden.getFile(path, true)
		let {
			res,
			data: file,
			filename: pathFile
		} = type
		if (res && res.status !== 200 || file.length <= 65536) {
			try {
				throw {
					json: JSON.parse(file.toString())
				}
			} catch (e) {
				if (e.json) throw e.json
			}
		}
		let opt = {
			filename
		}
		if (quoted) opt.quoted = quoted
		if (!type) options.asDocument = true
		let mtype = '',
			mimetype = type.mime,
			convert
		if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker'
		else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image'
		else if (/video/.test(type.mime)) mtype = 'video'
		else if (/audio/.test(type.mime))(
			convert = await toAudio(file, type.ext),
			file = convert.data,
			pathFile = convert.filename,
			mtype = 'audio',
			mimetype = 'audio/ogg; codecs=opus'
		)
		else mtype = 'document'
		if (options.asDocument) mtype = 'document'

		delete options.asSticker
		delete options.asLocation
		delete options.asVideo
		delete options.asDocument
		delete options.asImage

		let message = {
			...options,
			caption,
			ptt,
			[mtype]: {
				url: pathFile
			},
			mimetype,
			fileName: filename || pathFile.split('/').pop()
		}
		let m
		try {
			m = await vreden.sendMessage(jid, message, {
				...opt,
				...options
			})
		} catch (e) {
			m = null
		} finally {
			if (!m) m = await vreden.sendMessage(jid, {
				...message,
				[mtype]: file
			}, {
				...opt,
				...options
			})
			file = null
			return m
		}
	}

	vreden.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
		let mime = '';
		let res = await axios.head(url)
		mime = res.headers['content-type']
		if (mime.split("/")[1] === "gif") {
			return vreden.sendMessage(jid, {
				video: await getBuffer(url),
				caption: caption,
				gifPlayback: true,
				...options
			}, {
				quoted: quoted,
				...options
			})
		}
		let type = mime.split("/")[0] + "Message"
		if (mime === "application/pdf") {
			return vreden.sendMessage(jid, {
				document: await getBuffer(url),
				mimetype: 'application/pdf',
				caption: caption,
				...options
			}, {
				quoted: quoted,
				...options
			})
		}
		if (mime.split("/")[0] === "image") {
			return vreden.sendMessage(jid, {
				image: await getBuffer(url),
				caption: caption,
				...options
			}, {
				quoted: quoted,
				...options
			})
		}
		if (mime.split("/")[0] === "video") {
			return vreden.sendMessage(jid, {
				video: await getBuffer(url),
				caption: caption,
				mimetype: 'video/mp4',
				...options
			}, {
				quoted: quoted,
				...options
			})
		}
		if (mime.split("/")[0] === "audio") {
			return vreden.sendMessage(jid, {
				audio: await getBuffer(url),
				caption: caption,
				mimetype: 'audio/mpeg',
				...options
			}, {
				quoted: quoted,
				...options
			})
		}
	}

	vreden.sendTextWithMentions = async (jid, text, quoted, options = {}) => vreden.sendMessage(jid, {
		text: text,
		mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'),
		...options
	}, {
		quoted
	})
	
	vreden.getFile = async (PATH, returnAsFilename) => {
		let res, filename
		let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,` [1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
		if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
		let type = await FileType.fromBuffer(data) || {
			mime: 'application/octet-stream',
			ext: '.bin'
		}
		if (data && returnAsFilename && !filename)(filename = path.join(__dirname, './tmp/' + new Date * 1 + '.' + type.ext), await fs.promises.writeFile(filename, data))
		return {
			res,
			filename,
			...type,
			data
		}
	}

	vreden.sendStickerFromUrl = async (from, PATH, quoted, options = {}) => {
		let types = await vreden.getFile(PATH, true)
		let {
			filename,
			size,
			ext,
			mime,
			data
		} = types
		let type = '',
			mimetype = mime,
			pathFile = filename
		let media = {
			mimetype: mime,
			data
		}
		pathFile = await writeExif(media, {
			packname: options.packname ? options.packname : 'Vreden Bot',
			author: options.author ? options.author : '+6285727631507',
			categories: options.categories ? options.categories : []
		})
		await fs.promises.unlink(filename)
		await vreden.sendMessage(from, {
			sticker: {
				url: pathFile
			}
		}, {
			quoted
		})
		return fs.promises.unlink(pathFile)
	}

	vreden.imgToSticker = async (jid, path, quoted, options = {}) => {
		let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await fetchBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
		let buffer
		if (options && (options.packname || options.author)) {
			buffer = await writeExifImg(buff, options)
		} else {
			buffer = await imageToWebp(buff)
		}
		await vreden.sendMessage(jid, {
			sticker: {
				url: buffer
			},
			...options
		}, {
			quoted
		})
		return buffer
	}

	vreden.vidToSticker = async (jid, path, quoted, options = {}) => {
		let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await fetchBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
		let buffer
		if (options && (options.packname || options.author)) {
			buffer = await writeExifVid(buff, options)
		} else {
			buffer = await videoToWebp(buff)
		}
		await vreden.sendMessage(jid, {
			sticker: {
				url: buffer
			},
			...options
		}, {
			quoted
		})
		return buffer
	}

	vreden.sendImage = async (jid, path, caption = '', quoted = '', options) => {
		let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await fetch(path)).buffer() : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
		return await vreden.sendMessage(jid, {
			image: buffer,
			caption: caption,
			...options
		}, {
			quoted
		})
	}
	
	vreden.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
      let quoted = message.msg ? message.msg : message
      let isFile = message.mtype === "viewOnceMessageV2"
      let mime = (isFile ? quoted.message[getContentType(quoted.message)] : quoted).mimetype || ''
      let messageType = isFile ? (getContentType(quoted.message)).replace(/Message/gi, '') : message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
      const stream = await downloadContentFromMessage(isFile ? quoted.message[getContentType(quoted.message)] : quoted, messageType)
      let buffer = Buffer.from([])
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
      }
      let type = await FileType.fromBuffer(buffer)
      let trueFileName = attachExtension ? ('./tmp/' + filename + '.' + type.ext) : './tmp/' + filename
      await fs.writeFileSync(trueFileName, buffer)
      return trueFileName
    }
    
    vreden.downloadMediaMessage = async (message) => {
      let quoted = message.msg ? message.msg : message
      let isFile = message.mtype === "viewOnceMessageV2"
      let mime = (isFile ? quoted.message[getContentType(quoted.message)] : quoted).mimetype || ''
      let messageType = isFile ? (getContentType(quoted.message)).replace(/Message/gi, '') : message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
      const stream = await downloadContentFromMessage(isFile ? quoted.message[getContentType(quoted.message)] : quoted, messageType)
      let buffer = Buffer.from([])
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
      }
      return buffer
    }
    
    vreden.sendAudio = async (jid, path, quoted = '', ptt = false, options) => {
		let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await fetch(path)).buffer() : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
		return await vreden.sendMessage(jid, {
			audio: buffer,
			ptt: ptt,
			...options
		}, {
			quoted
		})
	}

	vreden.sendVideo = async (jid, path, gif = false, caption = '', quoted = '', options) => {
		let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,` [1], 'base64') : /^https?:\/\//.test(path) ? await (await fetch(path)).buffer() : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
		return await vreden.sendMessage(jid, {
			video: buffer,
			caption: caption,
			gifPlayback: gif,
			...options
		}, {
			quoted
		})
	}

	vreden.sendMedia = async (jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
		let types = await vreden.getFile(path, true)
		let {
			mime,
			ext,
			res,
			data,
			filename
		} = types
		if (res && res.status !== 200 || file.length <= 65536) {
			try {
				throw {
					json: JSON.parse(file.toString())
				}
			} catch (e) {
				if (e.json) throw e.json
			}
		}
		let type = '',
			mimetype = mime,
			pathFile = filename
		if (options.asDocument) type = 'document'
		if (options.asSticker || /webp/.test(mime)) {
			let media = {
				mimetype: mime,
				data
			}
			pathFile = await writeExif(media, {
				packname: options.packname ? options.packname : global.packname,
				author: options.author ? options.author : global.author,
				categories: options.categories ? options.categories : []
			})
			await fs.promises.unlink(filename)
			type = 'sticker'
			mimetype = 'image/webp'
		} else if (/image/.test(mime)) type = 'image'
		else if (/video/.test(mime)) type = 'video'
		else if (/audio/.test(mime)) type = 'audio'
		else type = 'document'
		await vreden.sendMessage(jid, {
			[type]: {
				url: pathFile
			},
			caption,
			mimetype,
			fileName,
			...options
		}, {
			quoted,
			...options
		})
		return fs.promises.unlink(pathFile)
	}

	vreden.copyNForward = async (jid, message, forceForward = false, options = {}) => {
		let vtype
		if (options.readViewOnce) {
			message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined)
			vtype = Object.keys(message.message.viewOnceMessage.message)[0]
			delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined))
			delete message.message.viewOnceMessage.message[vtype].viewOnce
			message.message = {
				...message.message.viewOnceMessage.message
			}
		}

		let mtype = Object.keys(message.message)[0]
		let content = await generateForwardMessageContent(message, forceForward)
		let ctype = Object.keys(content)[0]
		let context = {}
		if (mtype != "conversation") context = message.message[mtype].contextInfo
		content[ctype].contextInfo = {
			...context,
			...content[ctype].contextInfo
		}
		const waMessage = await generateWAMessageFromContent(jid, content, options ? {
			...content[ctype],
			...options,
			...(options.contextInfo ? {
				contextInfo: {
					...content[ctype].contextInfo,
					...options.contextInfo
				}
			} : {})
		} : {})
		await vreden.relayMessage(jid, waMessage.message, {
			messageId: waMessage.key.id
		})
		return waMessage
	}

	vreden.sendButtonText = (jid, buttons = [], text, footer, quoted = '', options = {
		contextInfo: {
			mentionedJid: vreden.ments(text),
		}
	}) => {
		let button = []
		for (let i = 0; i < buttons.length; i++) {
			button.push({
				"name": buttons[i].name,
				"buttonParamsJson": JSON.parse(JSON.stringify(buttons[i].buttonParamsJson))
			})
		}
		let msg = generateWAMessageFromContent(jid, {
					interactiveMessage: proto.Message.InteractiveMessage.create({
						...options,
						mentionedJid: vreden.ments(text),
						body: proto.Message.InteractiveMessage.Body.create({
							text: text
						}),
						footer: proto.Message.InteractiveMessage.Footer.create({
							text: footer
						}),
						header: proto.Message.InteractiveMessage.Header.create({
							title: "",
							hasMediaAttachment: false
						}),
						nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
							buttons: button,
						})
					})
		}, {
			quoted: quoted
		})

		vreden.relayMessage(msg.key.remoteJid, msg.message, {
			messageId: msg.key.id
		})
		return msg
	}
	
	vreden.sendButtonImage = async (jid, image, buttons = [], text, footer, quoted = '', options = {
		contextInfo: {
			mentionedJid: vreden.ments(text),
		}
	}) => {
		let button = []
		for (let i = 0; i < buttons.length; i++) {
			button.push({
				"name": buttons[i].name,
				"buttonParamsJson": JSON.parse(JSON.stringify(buttons[i].buttonParamsJson))
			})
		}
		var imageMessage = await prepareWAMessageMedia({
				image: image,
			},
			uploadFile,
		);
		let msg = generateWAMessageFromContent(jid, {
					interactiveMessage: proto.Message.InteractiveMessage.create({
						...options,
						body: proto.Message.InteractiveMessage.Body.create({
							text: ""
						}),
						footer: proto.Message.InteractiveMessage.Footer.create({
							text: footer
						}),
						header: proto.Message.InteractiveMessage.Header.create({
							title: text,
							subtitle: text,
							hasMediaAttachment: true,
							imageMessage: imageMessage.imageMessage
						}),
						nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
							buttons: button,
						})
					})
		}, {
			quoted: quoted
		})

		vreden.relayMessage(msg.key.remoteJid, msg.message, {
			messageId: msg.key.id
		})
		return msg
	}

	vreden.sendButtonVideo = async (jid, video, buttons = [], text, footer, quoted = '', options = {
		contextInfo: {
			mentionedJid: vreden.ments(text)
		}
	}) => {
		let button = []
		for (let i = 0; i < buttons.length; i++) {
			button.push({
				"name": buttons[i].name,
				"buttonParamsJson": JSON.parse(JSON.stringify(buttons[i].buttonParamsJson))
			})
		}
		var videoMessage = await prepareWAMessageMedia({
				video: video,
			},
			uploadFile,
		);
		let msg = generateWAMessageFromContent(jid, {
					interactiveMessage: proto.Message.InteractiveMessage.create({
						...options,
						body: proto.Message.InteractiveMessage.Body.create({
							text: text
						}),
						footer: proto.Message.InteractiveMessage.Footer.create({
							text: footer
						}),
						header: proto.Message.InteractiveMessage.Header.create({
							title: "",
							videoMessage: videoMessage.videoMessage,
							hasMediaAttachment: true
						}),
						nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
							buttons: button,
						})
					})
		}, {
			quoted: quoted
		})

		vreden.relayMessage(msg.key.remoteJid, msg.message, {
			messageId: msg.key.id
		})
		return msg
	}

	vreden.sendButtonDocument = async (jid, document = {}, buttons = [], text, footer, quoted = '', options = {
		contextInfo: {
			mentionedJid: vreden.ments(text)
		}
	}) => {
		let button = []
		for (let i = 0; i < buttons.length; i++) {
			button.push({
				"name": buttons[i].name,
				"buttonParamsJson": JSON.parse(JSON.stringify(buttons[i].buttonParamsJson))
			})
		}
		let msg = generateWAMessageFromContent(jid, {
					interactiveMessage: proto.Message.InteractiveMessage.create({
						...options,
						body: proto.Message.InteractiveMessage.Body.create({
							text: text
						}),
						footer: proto.Message.InteractiveMessage.Footer.create({
							text: footer
						}),
						header: proto.Message.InteractiveMessage.Header.create({
							title: "",
							hasMediaAttachment: true,
							...(await prepareWAMessageMedia(document, {
								upload: vreden.waUploadToServer
							}))
						}),
						gifPlayback: true,
						nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
							buttons: button,
						})
					})
		}, {
			quoted: quoted
		})

		await vreden.relayMessage(msg.key.remoteJid, msg.message, {
			messageId: msg.key.id
		})
		return msg
	}

	vreden.sendText = (jid, text, quoted = '', options) => vreden.sendMessage(jid, {
		text: text,
		...options
	}, {
		quoted,
		...options
	})

	vreden.ments = (teks = '') => {
		return teks.match('@') ? [...teks.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net') : []
	};
	
	vreden.sendteks = async (chatId, text = '', quoted = '', opts = {}) => {
		return vreden.sendMessage(chatId, {
			text: text,
			mentions: await vreden.ments(text),
			...opts
		}, {
			quoted: quoted
		})
	};
	
	vreden.sendPoll = (jid, name = '', values = [], selectableCount = global.select) => {
		return vreden.sendMessage(jid, {
			poll: {
				name,
				values,
				selectableCount
			}
		})
	};
	
	vreden.cMod = (jid, copy, text = '', sender = vreden.user.id, options = {}) => {
		let mtype = Object.keys(copy.message)[0]
		let isEphemeral = mtype === 'ephemeralMessage'
		if (isEphemeral) {
			mtype = Object.keys(copy.message.ephemeralMessage.message)[0]
		}
		let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message
		let content = msg[mtype]
		if (typeof content === 'string') msg[mtype] = text || content
		else if (content.caption) content.caption = text || content.caption
		else if (content.text) content.text = text || content.text
		if (typeof content !== 'string') msg[mtype] = {
			...content,
			...options
		}
		if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
		else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
		if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
		else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
		copy.key.remoteJid = jid
		copy.key.fromMe = sender === vreden.user.id

		return proto.WebMessageInfo.fromObject(copy)
	}
	return vreden
}

	const code = fs.readFileSync("./vreden.js", "utf8")
	var regex = /case\s+'([^']+)':/g;
	var matches = [];
	var match;
	while ((match = regex.exec(code))) {
		matches.push(match[1]);
	}
	global.help = Object.values(matches).flatMap(v => v ?? []).map(entry => entry.trim().split(' ')[0].toLowerCase()).filter(Boolean);
	global.handlers = [];
	const handlersDir = path.join(__dirname, 'plugin');
	console.log(chalk.white.bold("Memuat plugin..."))
	fs.readdirSync(handlersDir).forEach(file => {
		const filePath = path.join(handlersDir, file);
		if (fs.statSync(filePath).isFile() && file.endsWith('.js')) {
			const handler = require(filePath);
			global.handlers.push(handler);
			global.help.push(...handler.command)
		}
	});
	console.log(chalk.green("Plugin running..."))
	
	connectToWhatsApp()

let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})