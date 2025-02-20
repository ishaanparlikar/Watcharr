<script lang="ts">
  import type { MediaType, WatchedStatus } from "@/types";
  import Icon from "../Icon.svelte";
  import {
    addClassToParent,
    calculateTransformOrigin,
    isTouch,
    watchedStatuses
  } from "@/lib/util/helpers";
  import { goto } from "$app/navigation";
  import tooltip from "../actions/tooltip";
  import { baseURL, removeWatched, updateWatched } from "../util/api";
  import { notify } from "../util/notify";
  import { onMount } from "svelte";
  import PosterStatus from "./PosterStatus.svelte";
  import PosterRating from "./PosterRating.svelte";

  export let id: number | undefined = undefined; // Watched list id
  export let media: {
    poster_path?: string;
    title?: string;
    name?: string;
    overview?: string;
    id: number; // tmdb id
    media_type: MediaType;
    release_date?: string;
    first_air_date?: string;
  };
  export let rating: number | undefined = undefined;
  export let status: WatchedStatus | undefined = undefined;
  export let small = false;
  export let disableInteraction = false;
  export let hideButtons = false;
  // When provided, default click handlers will instead run this callback.
  export let onClick: (() => void) | undefined = undefined;

  // If poster is active (scaled up)
  let posterActive = false;

  let containerEl: HTMLDivElement;

  const title = media.title || media.name;
  // For now, if the content is on watched list, we can assume we have a local
  // cached image. Could be improved, since we could have a cached image for
  // show not on someone elses watched list.
  const poster = id
    ? `${baseURL}/img${media.poster_path}`
    : `https://image.tmdb.org/t/p/w500${media.poster_path}`;
  const link = media.id ? `/${media.media_type}/${media.id}` : undefined;
  const dateStr = media.release_date || media.first_air_date;
  const year = dateStr ? new Date(dateStr).getFullYear() : undefined;

  function handleStarClick(r: number) {
    if (r == rating) return;
    updateWatched(media.id, media.media_type, undefined, r);
  }

  function handleStatusClick(type: WatchedStatus | "DELETE") {
    if (type === "DELETE") {
      if (!id) {
        notify({ text: "Content has no watched list id, can't delete.", type: "error" });
        return;
      }
      removeWatched(id);
      return;
    }
    updateWatched(media.id, media.media_type, type);
  }

  function handleInnerKeyUp(e: KeyboardEvent) {
    console.log(e.target);
    if (e.key === "Enter" && (e.target as HTMLElement)?.id === "ilikemoviessueme") {
      if (typeof onClick !== "undefined") {
        onClick();
        return;
      }
      if (link) {
        goto(link);
      }
    }
  }

  onMount(() => {
    if (small && containerEl) {
      containerEl.classList.add("small");
    }
  });
</script>

<!-- HACK: disabled this issue for now, it should probably be fixed properly -->
<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
<li
  on:mouseenter={(e) => {
    if (!posterActive) calculateTransformOrigin(e);
    if (!isTouch()) {
      posterActive = true;
    }
  }}
  on:focusin={(e) => {
    if (!posterActive) calculateTransformOrigin(e);
  }}
  on:mouseleave={() => (posterActive = false)}
  on:click={() => (posterActive = true)}
  on:keypress={() => console.log("on kpress")}
  class={`${posterActive ? "active " : ""}`}
>
  <div class={`container${!poster ? " details-shown" : ""}`} bind:this={containerEl}>
    {#if poster}
      <div class="img-loader" />
      <img
        loading="lazy"
        src={poster}
        alt=""
        on:load={(e) => {
          addClassToParent(e, "img-loaded");
        }}
        on:error={(e) => {
          addClassToParent(e, "details-shown");
        }}
      />
    {/if}
    <div
      on:click={() => {
        if (typeof onClick !== "undefined") {
          onClick();
          return;
        }
        if (posterActive && link) goto(link);
      }}
      on:keyup={handleInnerKeyUp}
      id="ilikemoviessueme"
      class="inner"
      role="button"
      tabindex="0"
    >
      <h2>
        {#if typeof onClick === "undefined" && link}
          <a data-sveltekit-preload-data="tap" href={link}>
            {title}
          </a>
        {:else}
          {title}
        {/if}
        {#if year}
          <time>{year}</time>
        {/if}
      </h2>
      <span>{media.overview}</span>

      {#if !hideButtons}
        <div class="buttons">
          <PosterRating {rating} {handleStarClick} {disableInteraction} />
          <PosterStatus {status} {handleStatusClick} {disableInteraction} />
        </div>
      {/if}
    </div>
  </div>
</li>

<style lang="scss">
  li.active {
    cursor: pointer;
  }

  .container {
    display: flex;
    flex-flow: column;
    background-color: rgb(48, 45, 45);
    overflow: hidden;
    flex: 1 1;
    border-radius: 5px;
    width: 170px;
    height: 100%;
    min-height: 256.367px;
    position: relative;
    // aspect-ratio: 2/3;
    transition: transform 150ms ease;

    img {
      width: 100%;
      height: 100%;
    }

    &.img-loaded .img-loader,
    &.details-shown .img-loader {
      display: none;
    }

    .img-loader {
      position: absolute;
      width: 100%;
      height: 100%;
      background-color: gray;
      background: linear-gradient(359deg, #5c5c5c, #2c2929, #2c2424);
      background-size: 400% 400%;
      animation: imgloader 4s ease infinite;

      @keyframes imgloader {
        0% {
          background-position: 50% 0%;
        }
        50% {
          background-position: 50% 100%;
        }
        100% {
          background-position: 50% 0%;
        }
      }
    }

    .inner {
      position: absolute;
      opacity: 0;
      display: flex;
      flex-flow: column;
      top: 0;
      height: 100%;
      width: 100%;
      padding: 10px;
      background-color: transparent;
      transition: opacity 150ms cubic-bezier(0.19, 1, 0.22, 1);

      h2 {
        font-family:
          sans-serif,
          system-ui,
          -apple-system,
          BlinkMacSystemFont;
        font-size: 18px;
        color: white;
        word-wrap: break-word;

        a {
          color: white;
        }

        time {
          font-size: 14px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.7);
        }
      }

      span {
        color: white;
        margin: 5px 0 5px 0;
        font-size: 9px;
        display: -webkit-box;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        hyphens: auto;
        overflow: hidden;
      }

      .buttons {
        display: flex;
        flex-flow: row;
        margin-top: auto;
        gap: 10px;
        height: 35px;
      }
    }

    &.small .inner span {
      font-size: 11px;
    }

    &:hover,
    &:focus-within {
      transform: scale(1.3);
      z-index: 99;
    }

    &.small:hover,
    &.small:focus-within {
      transform: scale(1.1);
    }

    &:hover,
    &:focus-within,
    &:global(.details-shown) {
      img {
        filter: blur(4px) grayscale(80%);
        // This makes the background very dark,
        // but atleast the text is visible.. may want to change later.
        mix-blend-mode: multiply;
      }

      .inner {
        color: white;
        opacity: 1;
      }
    }
  }
</style>
