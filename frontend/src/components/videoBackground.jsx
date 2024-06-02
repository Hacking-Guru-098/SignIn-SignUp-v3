import React from "react";
import videoBG from "../assets/videoBG.mp4";


const VideoBackground = () => {
	return (
		<div className='w-2/5 h-full'>
			<video
				src={videoBG}
				autoPlay
				loop
				muted
				alt='Illustration of the signup process'
				className='m-0 p-0 w-full h-full object-cover'
			/>
		</div>
	);
};

export default VideoBackground;
