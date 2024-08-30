import { Twitch } from "./src/lib/twitch.ts";

const twitch = new Twitch("", "");

// const user = await twitch.client.users.getUserByName("bushwacker");
// if (!user) {
//   throw new Error("User not found");
// }
// console.log(user.id);
// console.log(user.name);


// get user clips
const hoursAgo = 168; // 7 days
const startDate = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
const endDate = new Date().toISOString();

// console.log({ startDate, endDate });


// const clips = await twitch.client.clips.getClipsForBroadcaster(user.id, {
//   limit: 2,
//   startDate,
//   endDate,
// });

// console.log(clips);

// for (const clip of clips.data) {
//   console.log(clip.title);
//   console.log(clip.views);
//   console.log("-----");
// }


const users = await twitch.client.users.getUsersByNames(["bushwacker", "agent3540", "acidtib"]);

console.log(users);

for (const user of users) {
  console.log(user.id);
  console.log(user.name);

  const clips = await twitch.client.clips.getClipsForBroadcaster(user.id, {
    limit: 2,
    startDate,
    endDate,
  });

  for (const clip of clips.data) {
    console.log(clip.title);
    console.log(clip.views);
    console.log("-----");
  }
}
