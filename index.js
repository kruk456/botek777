require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
const schedule = require('node-schedule');
const keepAlive = require("./server"); // Dodanie funkcji keepAlive

// Tworzymy instancję bota z odpowiednimi intentami
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Tworzymy pusty obiekt, aby przechowywać punkty graczy
let playerScores = {};

// Funkcja do znajdowania pierwszego dostępnego kanału tekstowego
async function getFirstTextChannel(guild) {
  const channels = guild.channels.cache;
  const textChannel = channels.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has(PermissionsBitField.Flags.SendMessages));
  return textChannel || null;
}

// Funkcja do wysyłania zliczonych danych i resetowania punktów
async function sendLeaderboardAndReset() {
  const guild = client.guilds.cache.first(); // Zakłada, że bot jest w jednym serwerze
  const channel = await getFirstTextChannel(guild);

  if (!channel) {
    console.error('Nie znaleziono dostępnego kanału tekstowego.');
    return;
  }

  // Tworzymy tabelę z wynikami
  let leaderboard = '```\n';
  leaderboard += 'Nick Gracza  |  Punkty\n';
  leaderboard += '----------------------\n';

  for (const [playerName, points] of Object.entries(playerScores)) {
    leaderboard += `${playerName.padEnd(14)} | ${points}\n`;
  }

  leaderboard += '```';

  // Wysyłamy tabelę z wynikami
  channel.send('Oto zliczone punkty:\n' + leaderboard);

  // Resetujemy dane punktów
  playerScores = {};
}

// Harmonogram na 7 września 2024 roku o 16:30 czasu polskiego
const specificDateJob = schedule.scheduleJob(new Date('2024-09-07T16:37:00+02:00'), async () => {
  await sendLeaderboardAndReset();
});

// Harmonogram na ostatni dzień miesiąca o godzinie 22:00 czasu polskiego
const monthlyJob = schedule.scheduleJob('0 22 28-31 * *', async () => {
  const now = new Date();
  if (now.getDate() === new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) {
    await sendLeaderboardAndReset();
  }
});

// Kiedy bot jest gotowy, wyświetlamy w konsoli jego nazwę użytkownika
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// Reagujemy na wiadomości zawierające komendy
client.on('messageCreate', async message => {
  // Ignorujemy wiadomości od botów, aby bot nie reagował na swoje własne wiadomości
  if (message.author.bot) return;

  // Sprawdzamy, czy wiadomość zaczyna się od komendy "!aktywnosc"
  if (message.content.startsWith('!aktywnosc')) {
    const args = message.content.split(' '); // Rozbijamy wiadomość na części

    // Sprawdzamy, czy mamy odpowiednią ilość argumentów (komenda, nick gracza i liczba punktów)
    if (args.length !== 3) {
      return message.channel.send('Poprawne użycie komendy: !aktywnosc {nickgracza} {liczba punktów}');
    }

    const playerName = args[1]; // Nazwa gracza
    const points = parseFloat(args[2]); // Liczba punktów

    // Sprawdzamy, czy liczba punktów jest poprawną liczbą
    if (isNaN(points)) {
      return message.channel.send('Podaj poprawną liczbę punktów.');
    }

    // Jeśli gracz nie jest jeszcze w obiekcie, dodajemy go z początkową liczbą punktów 0
    if (!playerScores[playerName]) {
      playerScores[playerName] = 0;
    }

    // Dodajemy punkty dla gracza
    playerScores[playerName] += points;

    // Wysyłamy wiadomość o zaktualizowanych punktach gracza
    message.channel.send(`Gracz ${playerName} ma teraz ${playerScores[playerName]} punktów.`);
  }

  // Sprawdzamy, czy wiadomość zaczyna się od komendy "!zliczenie"
  if (message.content.startsWith('!zliczenie')) {
    // Tworzymy tabelę z wynikami
    let leaderboard = '```\n';
    leaderboard += 'Nick Gracza  |  Punkty\n';
    leaderboard += '----------------------\n';

    for (const [playerName, points] of Object.entries(playerScores)) {
      leaderboard += `${playerName.padEnd(14)} | ${points}\n`;
    }

    leaderboard += '```';

    // Wysyłamy tabelę z wynikami
    message.channel.send(leaderboard);
  }

  // Sprawdzamy, czy wiadomość zaczyna się od komendy "!reset"
  if (message.content.startsWith('!reset')) {
    // Sprawdzamy, czy nadawca wiadomości ma rolę "botek"
    const roleName = 'botek';
    const member = message.guild.members.cache.get(message.author.id);
    const hasRole = member.roles.cache.some(role => role.name === roleName);

    if (!hasRole) {
      return message.channel.send('Nie masz uprawnień do używania tej komendy.');
    }

    // Resetujemy dane punktów
    playerScores = {};

    // Wysyłamy wiadomość potwierdzającą resetowanie
    message.channel.send('Dane punktów zostały zresetowane.');
  }
});

// Utrzymanie aktywności serwera
keepAlive();

// Logowanie bota
client.login(process.env.DISCORD_BOT_TOKEN);