const { Client, LocalAuth, ChatTypes } = require('whatsapp-web.js');
const wwjs = require('whatsapp-web.js');
const emojis = require('./emojis');
const qrcode = require('qrcode-terminal');
const path = require('path');
const fs = require('fs');
var DELAIS = 10000;
let messageToSaveForTransfer = null;
wwjs.ChatTypes.GROUP

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: "./session"
    })
});

client.once('ready', () => {
    console.log("Le client a démarré 🏎");
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

client.on('error', (error) => {
    console.error('Une erreur s\'est produite:', error);
});

client.initialize();

client.on('message_create', async (message) => {



    if (message.fromMe) {
        if (message.body == ".diffusion") {
            try {
                const groupChat = await client.getChatById(message.id.remote);
                if (groupChat.isGroup) { // S'assurer que le message vient d'un groupe pour cette commande
                    await message.reply("Démarrage de la diffusion aux participants de ce groupe. Veuillez patienter...");
                    await sendPrivateMessages(groupChat.participants);
                    await message.reply("Opération de diffusion terminée ! ✅");
                } else {
                    await message.reply("La commande 'diffusion' doit être utilisée dans un groupe.");
                }
            } catch (error) {
                console.error('Erreur lors de la diffusion (diffusion):', error.message);
                await message.reply("❌ Une erreur est survenue lors de la tentative de diffusion. Assurez-vous d'être dans un groupe et que le bot a les permissions nécessaires.");
            }
        }
        if (message.body == ".diffusion2") {

            try {
                const quotedMessage = await message.getQuotedMessage();
                if (!quotedMessage) {
                    await message.reply("La commande 'diffusion2' doit être utilisée en répondant à un message d'un groupe.");
                    return;
                }
                const groupChat = await client.getChatById(quotedMessage.id.remote);
                if (groupChat.isGroup) { // S'assurer que le message cité vient d'un groupe
                    await message.reply("Démarrage de la diffusion.....");
                    await sendPrivateMessages(groupChat.participants);
                    await message.reply("Opération de diffusion terminée ! ✅");
                } else {
                    await message.reply("Le message auquel vous répondez ('diffusion2') ne provient pas d'un groupe.");
                }
            } catch (error) {
                console.error('Erreur lors de la diffusion (diffusion2):', error.message);
                await message.reply("❌ Une erreur est survenue lors de la tentative de diffusion via le message cité. Assurez-vous de répondre à un message de groupe valide.");
            }
        }
        if(message.body == "save"){
            try {
                const quotedMessage = await message.getQuotedMessage();
                if (quotedMessage) {
                    messageToSaveForTransfer = quotedMessage; // Sauvegarde l'objet du message cité
                    await message.reply("Message sauvegardé avec succès pour un transfert futur ! ✅");
                    console.log(`Message sauvegardé: ID ${quotedMessage.id._serialized}`);
                } else {
                    await message.reply("Veuillez répondre au message que vous souhaitez sauvegarder avec la commande 'save'.");
                }
            } catch (error) {
                console.error('Erreur lors de la sauvegarde du message:', error.message);
                await message.reply("❌ Une erreur est survenue lors de la tentative de sauvegarde du message.");
            }
        }
        }
    
    else {
        const chat = await client.getChatById(message.id.remote);
        if (!chat.isGroup) {
            const str = message.body.toLowerCase();
            if (/bsr\s|bjr\s|bonsoir\s|bonjour\s|slt\s|salut\s/i.test(str)) {
                await message.react("👋");
            }
            if (/ok\s|d'accord\s|merci\s|okay\s/i.test(str)) {
                await message.react("👍");
            }

        }
    }
});




async function sendPrivateMessages(participants) {
    let successCount = 0;
    let failCount = 0;

    // Vérifier si un message a été sauvegardé
    if (!savedMessage) {
        console.error("Erreur: Aucun message sauvegardé pour la diffusion.");
        // Il est important de gérer ce cas, même si les checks sont faits en amont
        return;
    }

    for (const participant of participants) {
        try {
            const chat = await client.getChatById(participant.id._serialized);
            
            // On ne peut pas transférer un message à soi-même (le bot)
            // ou à un participant qui est l'ID du bot (très peu probable dans cette config, mais bonne pratique)
            if (participant.id._serialized === client.info.wid._serialized) {
                console.log(`Skipping self-transfer for ${participant.id._serialized}`);
                continue;
            }

            // --- TRANSFERT DU MESSAGE SAUVEGARDÉ ---
            await savedMessage.forward(chat.id._serialized);

            console.log(`Message transféré à ${participant.id._serialized} ✅`);
            successCount++;

            // Pause anti-spam
            await new Promise(resolve => setTimeout(resolve, DELAIS));
        } catch (error) {
            console.error(`Échec du transfert pour ${participant.id._serialized} ❌ :`, error.message);
            failCount++;
        }
    }
    console.log(`OPÉRATION DE DIFFUSION TERMINÉE ! Transferts réussis : ${successCount}, Échecs : ${failCount}`);
}