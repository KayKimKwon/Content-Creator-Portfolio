import Image from "next/image";

export default function Home() {
  return (
    <div className="bg-zinc-50 font-sans dark:bg-black">
    Input form
      <div>
        <h1> Creator section</h1>
        <p>Name, niche, short bio, location</p>
      </div> 
      <div>
        <h1>Contact section</h1>
        <p>email, instagram, tiktok, youtube</p>
      </div>
      <div>
        <h1>Profile photo</h1>
        <p>upload</p>
      </div>
      <div>
        <h1>Metrics Section</h1>
        <p>platform dropdown, followers, average likes, average comments, average views, most views, most likes, most comments</p>
      </div>
      <div>
        <h1>Past collabs</h1>
        <p>brand name, campaign type, deliverables, year</p>
      </div>
      <div>
        <h1>Target brand category</h1>
        <p>...</p>
      </div>
      <button>Generate Kit</button>
    </div>
  );
}
