import videoLeft from "../assets/videoBgLeft.mp4";
import React from "react";

const VideoLeft = () => {
	return (
		<div className='relative w-3/5 h-full'>
			<video
				src={videoLeft}
				autoPlay
				loop
				muted
				alt='Illustration of the signup process'
				className='absolute top-0 left-0 w-full h-full object-cover'
			/>
		</div>
	);
};

export default VideoLeft;