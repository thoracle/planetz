# Technical Design Document - Procedural Planet Generation with Marching Cubes

Below is a detailed response specifying the design elements from Sebastian Lague's Terraforming project and the technical elements from DanielEsteban's softxels project that are essential for developing a new web-based application to generate 3D spherical planets. The application uses Python3/Flask for the backend, Three.js for rendering, and includes user-friendly widgets (sliders and color pickers) for customizing procedural generation parameters.
Essential Design Elements from Terraforming
Sebastian Lague’s Terraforming project is a Unity-based application focused on real-time terrain deformation. While the new project shifts focus to generating static spherical planets rather than interactive sculpting, several design concepts are still highly relevant:
Marching Cubes Algorithm for Mesh Generation  
Description: In Terraforming, the Marching Cubes algorithm generates smooth, deformable terrain meshes from a scalar field, enabling detailed and organic terrain shapes.  

Relevance: This algorithm is critical for the new project to create the 3D mesh of the planet’s surface from a density field. It ensures the terrain is smooth and visually appealing, a key requirement for representing planetary surfaces.  

Adaptation: The core concept will be reused, though implemented in JavaScript/WebAssembly rather than Unity/C#.

Procedural Terrain Generation via Density Fields  
Description: Terraforming generates terrain procedurally by defining a density field, which the Marching Cubes algorithm then converts into a mesh. Parameters influence the terrain’s shape and features.  

Relevance: For the new project, a similar approach will generate the planet’s surface, using a density field based on distance from the center plus noise for terrain variation. This aligns with the goal of procedurally generated planets adjustable by users.  

Adaptation: The density field will be tailored to create spherical shapes, with user-controlled noise parameters replacing real-time deformation.

Interactive Parameter Adjustment  
Description: Terraforming allows users to adjust terrain properties dynamically (e.g., via mouse inputs for sculpting), emphasizing interactivity and real-time feedback.  

Relevance: While the new project won’t involve real-time sculpting, this design inspires the use of sliders and color pickers to adjust procedural generation parameters (e.g., noise scale, color gradients) with immediate visual updates.  

Adaptation: The interactivity shifts from sculpting to parameter tweaking, maintaining the user-friendly adjustment concept.

These design elements provide the foundation for generating and customizing the planet’s surface, focusing on procedural techniques and user control.
Essential Technical Elements from softxels
DanielEsteban’s softxels is a Three.js-based voxel renderer that leverages the Marching Cubes algorithm and WebAssembly for efficient world rendering. Its technical components are well-suited for the new project’s performance and rendering needs:
Chunk-Based Rendering  
Description: Softxels divides the voxel world into smaller chunks (e.g., 16x16x16 grids), enabling efficient rendering and updates by processing only necessary sections of the world.  

Relevance: For a large spherical planet, generating and rendering the entire mesh at once would be computationally expensive. Chunk-based rendering ensures performance by limiting computation to manageable portions of the grid, especially those intersecting the planet’s sphere.  

Implementation: The planet’s 3D grid will be split into chunks, with meshes generated and rendered independently using Three.js.

WebAssembly (WASM) for Marching Cubes  
Description: Softxels implements the Marching Cubes algorithm in WebAssembly, compiled from C++, to achieve high performance in the browser for mesh generation.  

Relevance: Given the computational intensity of Marching Cubes, especially for a detailed planet, WASM provides a significant speed boost over pure JavaScript, ensuring real-time responsiveness.  

Implementation: The WASM-based Marching Cubes from softxels will be adapted, accepting density field data and outputting mesh vertices, indices, and normals for Three.js.

WebAssembly (WASM) for Noise Function  
Description: Softxels uses a WASM-compiled noise function (e.g., Perlin or Simplex) to generate voxel densities efficiently, supporting procedural world creation.  

Relevance: The new project requires a fast, high-quality noise function to add terrain variation to the planet’s density field. Using WASM ensures performance for large grids and complex noise calculations.  

Implementation: The noise function will be reused from softxels, with parameters like scale, octaves, and persistence exposed to JavaScript for user control.

Customizable Parameters  
Description: Softxels allows customization of technical settings like chunk size and render radius, demonstrating how to expose parameters for user or developer adjustment.  

Relevance: This aligns with the new project’s need for user-friendly widgets to tweak planet generation (e.g., noise settings, terrain height). It provides a model for structuring adjustable parameters.  

Implementation: Parameters will be linked to HTML5 sliders and color pickers, controlling both geometry (via noise) and appearance (via shaders).

These technical elements ensure the application is performant, scalable, and capable of handling the complex computations required for planet generation in a web environment.
Integration into the New Project
The new application combines these elements into a cohesive system:
Backend (Python3/Flask):  
Serves static files (HTML, CSS, JavaScript, WASM) from a frontend directory.  

Minimal server-side logic, as processing occurs client-side.

Frontend (Three.js, JavaScript):  
User Interface: HTML5 sliders and color pickers adjust noise parameters (scale, octaves, persistence) and color gradients, inspired by Terraforming’s interactivity and softxels’ customization.  

Density Field: Generated in JavaScript using softxels’ WASM noise function, with density defined as:  

density(position) = ||position - center|| - planet_radius + noise(position)

Clipped to a sphere by setting density to a large positive value outside a maximum radius.

Mesh Generation: Uses softxels’ WASM Marching Cubes, run in Web Workers, on chunked sections of the density field (Terraforming’s design adapted to softxels’ technical approach).  

Rendering: Three.js renders chunk meshes with a custom shader for height-based coloring, leveraging softxels’ chunking for efficiency.

Performance Optimization:  
Chunks are only generated where they intersect the planet’s sphere (softxels’ technique).  

Web Workers and debouncing prevent UI lag during parameter updates.

Summary Table
Source

Element

Type

Purpose in New Project

Terraforming

Marching Cubes Algorithm

Design

Generate smooth planet mesh from density field

Terraforming

Procedural Terrain Generation

Design

Create planet surface with user-defined noise

Terraforming

Interactive Parameter Adjustment

Design

Inspire sliders for real-time parameter tweaking

softxels

Chunk-Based Rendering

Technical

Efficiently render large planet by dividing into chunks

softxels

WASM Marching Cubes

Technical

Fast mesh generation in browser

softxels

WASM Noise Function

Technical

High-performance terrain variation

softxels

Customizable Parameters

Technical

Model for exposing generation settings to users

This design leverages Terraforming’s intuitive terrain generation concepts and softxels’ optimized technical framework to create a web-based, interactive planet generator that meets all specified requirements: Python3/Flask backend, Three.js frontend, and user-friendly customization via widgets.

