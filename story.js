'use strict';
/*
 * HUNTER SUB: story data. Cutscenes, nightly objectives, and endings.
 * Loaded before game.js. Pure data plus a couple of helpers; no game logic.
 *
 * The arc: Dale lives in the shed behind his ex-wife's house (the divorce decree calls it "the guest house").
 * The HOA is about to buy the woods (Dale's grandpa's old hunting land) and bulldoze it for "Phase 2."
 * The land goes to auction after deer season. Dale needs a $1,500 deposit to bid on it.
 * He'll get there one venison pack at a time.
 */

const SPEAKERS = {
  dale: ['Dale', '#ff7a1a'],
  darlene: ['Darlene', '#ff9ad5'],
  tyler: ['Tyler (Dale\'s son, 16)', '#7cf'],
  earl: ['Earl', '#e0b83a'],
  steve: ['Sketchy Steve', '#b5e86a'],
  linda: ['Linda Vance, HOA President', '#ffd166'],
  gary: ['Gary Pfister, HOA Treasurer', '#6fa8ff'],
  todd: ['Todd, Neighborhood Watch', '#9be564'],
  kowalski: ['Officer Kowalski', '#9ecbff'],
  henderson: ['Mr. Henderson', '#ffe7a0'],
  mom: ['Mom (on speakerphone)', '#ffc4e6'],
  narrator: ['', '#bbbbbb'],
};

const CABIN_GOAL = 1500;

const SCENES = {
  intro1: [
    ['narrator', 'Whispering Pines Estates. 4:40 AM. Opening day of deer season.'],
    ['narrator', 'Eight months ago, Darlene got the house. Dale got the shed in the backyard. The divorce decree calls it "the guest house." It has a chest freezer and one outlet.'],
    ['dale', 'Home sweet shed.'],
    ['tyler', '(text) Dad. Mom says if she catches you hunting in the yard again she\'s calling Kowalski. Also the HOA put up NO HUNTING signs. Like, everywhere.'],
    ['dale', '(text) Tell your mom the deer started it. They ate her hydrangeas.'],
    ['narrator', 'Taped to the freezer is a flyer: "PUBLIC AUCTION: Pruitt Woods, 40 acres. Bidders must post a $1,500 deposit." Grandpa\'s land. The HOA wants it for "Phase 2."'],
    ['dale', 'Fifteen hundred bucks. I have a bow, a freezer, and a cousin of a cousin who buys meat out of a van.'],
    ['steve', '(text) its steve. heard u got deer. van is on the east logging road. bring cash, i mean bring meat, i bring cash. delete this'],
  ],
  after1: [
    ['narrator', 'Dale hangs his vest on the shed door. The freezer hums.'],
    ['earl', '(voicemail) Dale, it\'s Earl. Heard there was a commotion at the Pines last night. I don\'t want to know. Shop\'s open. Bring cash.'],
    ['tyler', '(text) mom is SO mad. linda is calling an emergency meeting. also can u teach me to bowhunt'],
    ['dale', '(text) Absolutely not. Maybe. Ask me after the season.'],
  ],
  intro2: [
    ['linda', 'Residents! As of tonight, Neighborhood Watch patrols are MANDATORY. Todd has graciously volunteered.'],
    ['todd', 'I have a whistle. And a vest. And a dream.'],
    ['earl', '(text) Dale. Unrelated: I need 3 squirrels for my famous squirrel chili. Pays $90. Don\'t ask what\'s in the chili.'],
    ['dale', 'Squirrels. In the trees. Small, fast, loud. Great.'],
  ],
  after2: [
    ['earl', 'One day this chili\'s gonna win a ribbon. Or a visit from the health department.'],
    ['henderson', '(shouting from his porch) MARTHA! I\'M STAYING UP TONIGHT! I\'LL CATCH HIM MYSELF!'],
    ['dale', 'Who\'s Martha?'],
    ['tyler', '(text) nobody knows. also mom has grandpa\'s old longbow in the garage. she said she\'s "keeping it as leverage"'],
    ['tyler', '(text) also garys daughter raven moved back in with him. shes 26 and goth. she thinks ur a cryptid. shes making TRADING CARDS of u'],
    ['dale', 'What\'s a cryptid?'],
    ['tyler', '(text) like bigfoot. but orange'],
  ],
  intro3: [
    ['narrator', 'Rain hammers the shed roof. Perfect cover.'],
    ['narrator', 'Out past the south treeline, orange survey stakes have appeared overnight. A bulldozer is parked in the mud. PHASE 2: COMING SOON.'],
    ['dale', 'Grandpa\'s longbow. Hand-carved hickory. Quiet as a whisper. And it\'s hanging in Darlene\'s garage next to her Peloton.'],
    ['tyler', '(text) side door of the garage is unlocked. i didnt tell u that. mom walks past it like every 30 seconds'],
    ['gary', '(at the HOA meeting) Motion to make "Orange Menace" the official villain of the newsletter?'],
    ['linda', 'Seconded. Unanimous. The Pruitt Woods auction is right after deer season. Phase 2 is HAPPENING, people.'],
  ],
  after3: [
    ['narrator', 'Tyler texts a photo of Grandpa\'s longbow. Dale\'s initials are carved under the grip. Next to them: "T.P." Tyler\'s, carved when he was six.'],
    ['dale', 'Huh.'],
    ['darlene', '(knocking on the shed) Dale. I know what that bow means to you. I\'m... willing to talk about it. This time.'],
    ['darlene', 'Tyler told me about the auction. Don\'t make me regret this.'],
  ],
  intro4: [
    ['narrator', 'Fog rolls off the woods. Gary has bought a drone with HOA dues.'],
    ['gary', 'Eye in the Sky is ONLINE. I have practiced in the parking lot for six hours.'],
    ['tyler', '(text) dad. DAD. i found something. linda has been selling koi from the HOA clubhouse pond. like the expensive ones the HOA bought with dues. to STEVE'],
    ['steve', '(text) i dont know any lindas. i dont know any koi. but if u happened to catch one with an HOA tag on it that would be crazy proof wouldnt it'],
    ['dale', 'The clubhouse pond. North woods. If I catch a tagged koi, that\'s proof Linda\'s been skimming the HOA.'],
  ],
  after4: [
    ['narrator', 'Tyler digs up the HOA\'s koi invoice. One fish: $1,200. Suddenly the dues make sense.'],
    ['tyler', '(text) i sent the koi bill to the HOA group chat. its chaos. gary is "investigating." linda says its complicated'],
    ['earl', 'Last night of the season tomorrow. They say Old Hosta\'s been seen by the creek. Fourteen points. Every hunter in the county has missed him.'],
    ['dale', 'Grandpa never missed him. Grandpa never shot him either. Said some deer you just let be.'],
    ['dale', '...I could really use the money though.'],
  ],
  intro5: [
    ['narrator', 'The first snow of the year falls overnight. Perfectly quiet. Perfectly white. Every footprint shows.'],
    ['tyler', '(text) dad the snow!! stay on the plowed roads or they\'ll track you. todd is SO excited about tracking'],
    ['narrator', 'Past the treeline, a bulldozer sits in the Phase 2 clearing, waiting for tomorrow.'],
    ['linda', 'Tomorrow at noon, the Pruitt Woods go to auction, and the HOA WILL win. Tonight, everyone is on patrol. EVERYONE.'],
    ['kowalski', 'Ma\'am, I\'m one guy with a dog.'],
    ['linda', 'Then bring the dog, Raymond.'],
    ['dale', 'Last night. Fill the freezer. Sell everything. Find Old Hosta.'],
    ['darlene', '(from the kitchen window) Dale. Be careful. And for God\'s sake take off the orange vest.'],
    ['dale', 'Never.'],
  ],
  busted: [
    ['kowalski', 'Dale. Buddy. We\'ve talked about this.'],
    ['dale', 'I was taking out the trash.'],
    ['kowalski', 'With a bow. At 5 AM. In Gary\'s hydrangeas.'],
  ],
};

// Optional story objectives, one per night (reward is cash, plus story flags).
const OBJECTIVES = {
  1: { id: 'sell', text: 'Sell a pack to Sketchy Steve (east logging road)', reward: 50, need: 1 },
  2: { id: 'squirrels', text: 'Bag 3 squirrels for Earl\'s chili', reward: 90, need: 3 },
  3: { id: 'longbow', text: 'Take Grandpa\'s Longbow back from Darlene\'s garage', reward: 0, need: 1, place: 'garage' },
  4: { id: 'koi', text: 'Catch a tagged koi at the HOA clubhouse pond (north woods)', reward: 100, need: 1, place: 'koi' },
  5: { id: 'hosta', text: 'Bring Old Hosta back to the shed', reward: 250, need: 1 },
};

// The ending depends on how the season went.
function buildEnding(c) {
  const lines = [['narrator', 'The next day. Noon. The Whispering Pines HOA clubhouse. The Pruitt Woods auction.']];
  const rich = c.cash >= CABIN_GOAL;
  const koi = c.flags.koi;
  const friendly = c.exSightings <= 6;
  // Secret ending: every story objective done, the deposit raised, and Darlene barely caught you.
  const secret = rich && ['sell', 'squirrels', 'longbow', 'koi', 'hosta'].every(f => c.flags[f]) && c.exSightings <= 3;
  if (koi) {
    lines.push(['gary', 'Before we begin: I have... a report. On the koi.']);
    lines.push(['linda', 'GARY. Sit DOWN.']);
    lines.push(['gary', '$14,000 in HOA koi, Linda. Fourteen. Thousand.']);
    lines.push(['narrator', 'Linda Vance is removed as HOA president by a vote of 31 to 1. The 1 is Linda.']);
    if (secret) {
      lines.push(['todd', 'I\'d like to nominate... the Orange Menace.']);
      lines.push(['darlene', 'Seconded.']);
      lines.push(['narrator', 'In the first write-in victory in Whispering Pines history, the new HOA president is Dale Pruitt. He accepts the gavel while wearing the orange vest.']);
      lines.push(['dale', 'Motion one: Bylaw 14.3 is repealed. Motion two: the HOA budget now includes an annual venison BBQ.']);
      lines.push(['narrator', 'Both motions pass unanimously. HOA President Dale Pruitt does not move out of the shed. He says it has "character."']);
    } else {
      lines.push(['narrator', friendly ? 'The new HOA president, elected in a landslide: Darlene Pruitt. Her first act is to repeal Bylaw 14.3.' : 'The new HOA president, elected by default because nobody else wanted it: Todd.']);
    }
  } else {
    lines.push(['linda', 'The HOA bids twelve hundred dollars. Do I hear more? No? I didn\'t think so.']);
  }
  if (rich) {
    lines.push(['dale', 'Fifteen hundred.']);
    lines.push(['narrator', 'The room goes silent. Dale puts a cooler on the table. It is full of cash. It smells faintly of venison.']);
    lines.push(['narrator', koi ? 'With Linda gone, nobody bids against him. Pruitt Woods goes back to a Pruitt.' : 'Linda bids again. Dale bids again. Linda runs out of HOA dues. Pruitt Woods goes back to a Pruitt.']);
    lines.push(['tyler', 'So... can you teach me to bowhunt now?']);
    lines.push(['dale', 'First lesson: never wear orange.']);
    lines.push(['tyler', 'You wear orange EVERY DAY.']);
    lines.push(['dale', 'Do as I say, not as I do.']);
  } else {
    lines.push(['narrator', `Dale has $${c.cash}. The deposit is $${CABIN_GOAL}. He isn't close enough.`]);
    if (koi) {
      lines.push(['darlene', 'The HOA is withdrawing its bid. Without Linda, nobody wants Phase 2. The woods aren\'t going anywhere, Dale.']);
      lines.push(['dale', 'So I\'ve got until next season.']);
      lines.push(['darlene', 'You\'ve got until next season. And you\'re paying rent on the shed.']);
    } else {
      lines.push(['narrator', 'Phase 2 breaks ground in the spring. Dale and Earl watch the bulldozers from the bait shop parking lot.']);
      lines.push(['earl', 'There\'s always the golf course, Dale.']);
      lines.push(['dale', 'Earl. Don\'t give me ideas.']);
    }
  }
  if (c.flags.hosta) {
    lines.push(['narrator', 'Old Hosta\'s antlers hang over the register at Earl\'s Bait & Tackle. People drive from three counties to see them.']);
  } else {
    lines.push(['narrator', 'At dawn, a fourteen-point buck steps out of the treeline, looks at the shed for a long moment, and walks back into the woods. Old Hosta is still out there.']);
  }
  if (rich && koi) {
    // Epilogue: the first annual Pruitt Woods venison BBQ
    lines.push(['narrator', 'One month later. The first annual Pruitt Woods Venison BBQ.']);
    lines.push(['earl', 'Squirrel chili\'s on the left. Don\'t ask what\'s in it.']);
    lines.push(['steve', 'I brought the coolers. They\'re, uh, clean. Mostly.']);
    lines.push(['gary', 'I\'m not issuing a single fine today. It feels weird. I hate it. I love it.']);
    lines.push(['henderson', 'MARTHA! THERE\'S A BBQ! ...She says it\'s lovely.']);
    lines.push(['kowalski', 'Off duty. Two burritos. Don\'t tell Sarge.']);
  }
  lines.push(['narrator', friendly ? 'Darlene leaves a plate of eggs on the shed steps. That\'s new.' : 'Darlene changes the locks on the garage. And the shed. From the outside.']);
  lines.push(['narrator', 'THE END. (Thanks for playing Hunter Sub.)']);
  return lines;
}
