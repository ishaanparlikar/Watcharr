import { follows, serverFeatures, userInfo, userSettings, watchedList } from "@/store";
import {
  UserType,
  type JellyfinFoundContent,
  type MediaType,
  type Watched,
  type WatchedAddRequest,
  type WatchedStatus,
  type WatchedUpdateRequest,
  type WatchedUpdateResponse,
  type UserSettings,
  type Follow
} from "@/types";
import axios from "axios";
import { get } from "svelte/store";
import { notify } from "./notify";
const { MODE } = import.meta.env;

export const baseURL = MODE === "development" ? "http://127.0.0.1:3080/api" : "/api";

/**
 *
 * @param contentId TMDB ID
 * @param contentType
 * @param status
 * @param rating
 * @returns
 */
export function updateWatched(
  contentId: number,
  contentType: MediaType,
  status?: WatchedStatus,
  rating?: number,
  thoughts?: string
) {
  // If item is already in watched store, run update request instead
  const wList = get(watchedList);
  const wEntry = wList.find(
    (w) => w.content.tmdbId === contentId && w.content.type === contentType
  );
  if (wEntry?.id) {
    const nid = notify({ text: `Saving`, type: "loading" });
    if (!status && !rating && typeof thoughts === "undefined") return;
    const obj = {} as WatchedUpdateRequest;
    if (status) obj.status = status;
    if (rating) obj.rating = rating;
    if (typeof thoughts !== "undefined") obj.thoughts = thoughts;
    if (thoughts === "") obj.removeThoughts = true;
    axios
      .put<WatchedUpdateResponse>(`/watched/${wEntry.id}`, obj)
      .then((resp) => {
        if (status) wEntry.status = status;
        if (rating) wEntry.rating = rating;
        if (typeof thoughts !== "undefined") wEntry.thoughts = thoughts;
        if (resp?.data?.newActivity) {
          if (wEntry.activity?.length > 0) {
            wEntry.activity.push(resp.data.newActivity);
          } else {
            wEntry.activity = [resp.data.newActivity];
          }
          // We want to update the updatedAt field too (so
          // change is reflected when filtering modified at)
          // We can piggy back from this data for now.
          wEntry.updatedAt = resp.data.newActivity.createdAt;
        }
        watchedList.update((w) => w);
        notify({ id: nid, text: `Saved!`, type: "success" });
      })
      .catch((err) => {
        console.error(err);
        notify({ id: nid, text: "Failed To Update!", type: "error" });
      });
    return;
  }
  // Add new watched item
  const nid = notify({ text: `Adding`, type: "loading" });
  axios
    .post("/watched", {
      contentId,
      contentType,
      rating,
      status
    } as WatchedAddRequest)
    .then((resp) => {
      console.log("Added watched:", resp.data);
      wList.push(resp.data as Watched);
      watchedList.update(() => wList);
      notify({ id: nid, text: `Added!`, type: "success" });
    })
    .catch((err) => {
      console.error(err);
      notify({ id: nid, text: "Failed To Add!", type: "error" });
    });
}

/**
 * Delete an item from watched list.
 * @param id Watched Entry ID
 */
export function removeWatched(id: number) {
  const nid = notify({ text: `Removing`, type: "loading" });
  const wList = get(watchedList);
  const wEntry = wList.find((w) => w.id === id);
  if (!wEntry) {
    console.log("Watched entry does not exist!");
    notify({ text: "Item Doesn't Exist On Watched List!", type: "error" });
    return;
  }
  axios
    .delete(`/watched/${id}`)
    .then((resp) => {
      console.log("Removed watched:", resp.data);
      const newList = wList.filter((w) => w.id !== id);
      watchedList.update(() => newList);
      notify({ id: nid, text: "Removed!", type: "error" });
    })
    .catch((err) => {
      console.error(err);
      notify({ id: nid, text: "Failed To Remove!", type: "error" });
    });
}

export async function contentExistsOnJellyfin(
  type: MediaType,
  name: string,
  tmdbId: number
): Promise<JellyfinFoundContent | undefined> {
  try {
    const user = get(userInfo);
    if (Number(user?.type) == UserType.Jellyfin) {
      const resp = await axios.get(`/jellyfin/${type}/${name}/${tmdbId}`);
      console.log("contentExistsOnJellyfin response:", resp.data);
      return resp.data as JellyfinFoundContent;
    }
  } catch (err) {
    console.error(err);
    // notify({ text: "Failed To Remove!", type: "error" });
  }
}

export function updateUserSetting<K extends keyof UserSettings>(
  name: K,
  value: UserSettings[K],
  done?: () => void
) {
  console.log("Updating user setting", name, "to", value);
  const uSettings = get(userSettings);
  if (!uSettings) {
    console.log("updateUserSetting: userSettings not set..");
    return;
  }
  const originalValue = uSettings[name];
  const nid = notify({ type: "loading", text: "Updating" });
  axios
    .post("/user/update", { [name]: value })
    .then((r) => {
      if (r.status === 200) {
        uSettings[name] = value;
        userSettings.update((u) => (u = uSettings));
        notify({ id: nid, type: "success", text: "Updated" });
        if (typeof done !== "undefined") done();
      }
    })
    .catch((err) => {
      console.error("Failed to update user setting", err);
      notify({ id: nid, type: "error", text: "Couldn't Update" });
      uSettings[name] = originalValue;
      userSettings.update((u) => (u = uSettings));
      if (typeof done !== "undefined") done();
    });
}

/**
 * Update serverFeatues store with fresh data.
 */
export async function getServerFeatures() {
  try {
    const f = await axios.get("/features");
    if (f?.data) {
      serverFeatures.update((sf) => (sf = f.data));
    }
  } catch (err) {
    console.error("getServerFeatures failed!", err);
  }
}

export async function followUser(id: number) {
  const nid = notify({ text: `Following`, type: "loading" });
  axios
    .post(`/follow/${id}`)
    .then((resp) => {
      console.log("Followed:", resp.data);
      const f = get(follows);
      f.push(resp.data as Follow);
      follows.update(() => f);
      notify({ id: nid, text: `Followed!`, type: "success" });
    })
    .catch((err) => {
      console.error(err);
      notify({ id: nid, text: "Failed To Follow!", type: "error" });
    });
}

export async function unfollowUser(id: number) {
  const nid = notify({ text: `Unfollowing`, type: "loading" });
  axios
    .delete(`/follow/${id}`)
    .then((resp) => {
      console.log("Unfollowed:", resp.data);
      const f = get(follows);
      follows.update(() => f.filter((fo) => fo.followedUser.id != id));
      notify({ id: nid, text: `Unfollowed!`, type: "success" });
    })
    .catch((err) => {
      console.error(err);
      notify({ id: nid, text: "Failed To Unfollow!", type: "error" });
    });
}

/**
 * For use with routes that don't require authentication (eg login/register)
 */
export const noAuthAxios = axios.create({
  baseURL: baseURL
});
