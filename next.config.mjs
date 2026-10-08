/** @type {import('next').NextConfig} */
const nextConfig = {
	// self-contained server for the Docker image (see Dockerfile)
	output: "standalone",
};

export default nextConfig;
