using System.Diagnostics.CodeAnalysis;
using System.Runtime.InteropServices;

namespace AgroRenderer;

[SuppressMessage("ReSharper", "InconsistentNaming")]
[SuppressMessage("ReSharper", "UnusedMember.Global")]
[SuppressMessage("ReSharper", "UnusedType.Global")]
[SuppressMessage("ReSharper", "MemberCanBePrivate.Global")]
public static unsafe class GLSLang
{
    // This class is using the "new" glslang C API (https://github.com/KhronosGroup/glslang#c-functional-interface-new)
    // as found in glslang_c_interface.h 
    
#if OS_WINDOWS
private const string GLSLANG_DLL = "glslang.dll";
#elif OS_LINUX
private const string GLSLANG_DLL = "libglslang.so";
private const string GLSLANG_RESOURCE_LIMITS_DLL = "libglslang-default-resource-limits.so";
#elif OS_MAC
private const string GLSLANG_DLL = "libglslang.dylib";
#endif

    // ----------------------------------------------------------------
    // Enums & Structs

    public enum glslang_stage_t
    {
        GLSLANG_STAGE_VERTEX,
        GLSLANG_STAGE_TESSCONTROL,
        GLSLANG_STAGE_TESSEVALUATION,
        GLSLANG_STAGE_GEOMETRY,
        GLSLANG_STAGE_FRAGMENT,
        GLSLANG_STAGE_COMPUTE,
        GLSLANG_STAGE_RAYGEN,
        GLSLANG_STAGE_RAYGEN_NV = GLSLANG_STAGE_RAYGEN,
        GLSLANG_STAGE_INTERSECT,
        GLSLANG_STAGE_INTERSECT_NV = GLSLANG_STAGE_INTERSECT,
        GLSLANG_STAGE_ANYHIT,
        GLSLANG_STAGE_ANYHIT_NV = GLSLANG_STAGE_ANYHIT,
        GLSLANG_STAGE_CLOSESTHIT,
        GLSLANG_STAGE_CLOSESTHIT_NV = GLSLANG_STAGE_CLOSESTHIT,
        GLSLANG_STAGE_MISS,
        GLSLANG_STAGE_MISS_NV = GLSLANG_STAGE_MISS,
        GLSLANG_STAGE_CALLABLE,
        GLSLANG_STAGE_CALLABLE_NV = GLSLANG_STAGE_CALLABLE,
        GLSLANG_STAGE_TASK,
        GLSLANG_STAGE_TASK_NV = GLSLANG_STAGE_TASK,
        GLSLANG_STAGE_MESH,
        GLSLANG_STAGE_MESH_NV = GLSLANG_STAGE_MESH,
        GLSLANG_STAGE_COUNT // LAST_ELEMENT_MARKER
    }

    [Flags]
    public enum glslang_stage_mask_t
    {
        GLSLANG_STAGE_VERTEX_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_VERTEX),
        GLSLANG_STAGE_TESSCONTROL_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_TESSCONTROL),
        GLSLANG_STAGE_TESSEVALUATION_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_TESSEVALUATION),
        GLSLANG_STAGE_GEOMETRY_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_GEOMETRY),
        GLSLANG_STAGE_FRAGMENT_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_FRAGMENT),
        GLSLANG_STAGE_COMPUTE_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_COMPUTE),
        GLSLANG_STAGE_RAYGEN_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_RAYGEN),
        GLSLANG_STAGE_RAYGEN_NV_MASK = GLSLANG_STAGE_RAYGEN_MASK,
        GLSLANG_STAGE_INTERSECT_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_INTERSECT),
        GLSLANG_STAGE_INTERSECT_NV_MASK = GLSLANG_STAGE_INTERSECT_MASK,
        GLSLANG_STAGE_ANYHIT_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_ANYHIT),
        GLSLANG_STAGE_ANYHIT_NV_MASK = GLSLANG_STAGE_ANYHIT_MASK,
        GLSLANG_STAGE_CLOSESTHIT_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_CLOSESTHIT),
        GLSLANG_STAGE_CLOSESTHIT_NV_MASK = GLSLANG_STAGE_CLOSESTHIT_MASK,
        GLSLANG_STAGE_MISS_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_MISS),
        GLSLANG_STAGE_MISS_NV_MASK = GLSLANG_STAGE_MISS_MASK,
        GLSLANG_STAGE_CALLABLE_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_CALLABLE),
        GLSLANG_STAGE_CALLABLE_NV_MASK = GLSLANG_STAGE_CALLABLE_MASK,
        GLSLANG_STAGE_TASK_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_TASK),
        GLSLANG_STAGE_TASK_NV_MASK = GLSLANG_STAGE_TASK_MASK,
        GLSLANG_STAGE_MESH_MASK = (1 << glslang_stage_t.GLSLANG_STAGE_MESH),
        GLSLANG_STAGE_MESH_NV_MASK = GLSLANG_STAGE_MESH_MASK,
        GLSLANG_STAGE_MASK_COUNT = (1 << 24) // Placeholder for count marker
    }

    public enum glslang_source_t
    {
        GLSLANG_SOURCE_NONE,
        GLSLANG_SOURCE_GLSL,
        GLSLANG_SOURCE_HLSL,
        GLSLANG_SOURCE_COUNT // LAST_ELEMENT_MARKER
    }

    public enum glslang_client_t
    {
        GLSLANG_CLIENT_NONE,
        GLSLANG_CLIENT_VULKAN,
        GLSLANG_CLIENT_OPENGL,
        GLSLANG_CLIENT_COUNT // LAST_ELEMENT_MARKER
    }

    public enum glslang_target_language_t
    {
        GLSLANG_TARGET_NONE,
        GLSLANG_TARGET_SPV,
        GLSLANG_TARGET_COUNT // LAST_ELEMENT_MARKER
    }

    public enum glslang_target_client_version_t
    {
        GLSLANG_TARGET_VULKAN_1_0 = (1 << 22),
        GLSLANG_TARGET_VULKAN_1_1 = (1 << 22) | (1 << 12),
        GLSLANG_TARGET_VULKAN_1_2 = (1 << 22) | (2 << 12),
        GLSLANG_TARGET_VULKAN_1_3 = (1 << 22) | (3 << 12),
        GLSLANG_TARGET_VULKAN_1_4 = (1 << 22) | (4 << 12),
        GLSLANG_TARGET_OPENGL_450 = 450,
        GLSLANG_TARGET_CLIENT_VERSION_COUNT = 6 // LAST_ELEMENT_MARKER
    }

    public enum glslang_target_language_version_t
    {
        GLSLANG_TARGET_SPV_1_0 = (1 << 16),
        GLSLANG_TARGET_SPV_1_1 = (1 << 16) | (1 << 8),
        GLSLANG_TARGET_SPV_1_2 = (1 << 16) | (2 << 8),
        GLSLANG_TARGET_SPV_1_3 = (1 << 16) | (3 << 8),
        GLSLANG_TARGET_SPV_1_4 = (1 << 16) | (4 << 8),
        GLSLANG_TARGET_SPV_1_5 = (1 << 16) | (5 << 8),
        GLSLANG_TARGET_SPV_1_6 = (1 << 16) | (6 << 8),
        GLSLANG_TARGET_LANGUAGE_VERSION_COUNT = 7 // LAST_ELEMENT_MARKER
    }

    public enum glslang_executable_t
    {
        GLSLANG_EX_VERTEX_FRAGMENT,
        GLSLANG_EX_FRAGMENT
    }

    public enum glslang_optimization_level_t
    {
        GLSLANG_OPT_NO_GENERATION,
        GLSLANG_OPT_NONE,
        GLSLANG_OPT_SIMPLE,
        GLSLANG_OPT_FULL,
        GLSLANG_OPT_LEVEL_COUNT // LAST_ELEMENT_MARKER
    }

    public enum glslang_texture_sampler_transform_mode_t
    {
        GLSLANG_TEX_SAMP_TRANS_KEEP,
        GLSLANG_TEX_SAMP_TRANS_UPGRADE_TEXTURE_REMOVE_SAMPLER,
        GLSLANG_TEX_SAMP_TRANS_COUNT // LAST_ELEMENT_MARKER
    }

    [Flags]
    public enum glslang_messages_t
    {
        GLSLANG_MSG_DEFAULT_BIT = 0,
        GLSLANG_MSG_RELAXED_ERRORS_BIT = (1 << 0),
        GLSLANG_MSG_SUPPRESS_WARNINGS_BIT = (1 << 1),
        GLSLANG_MSG_AST_BIT = (1 << 2),
        GLSLANG_MSG_SPV_RULES_BIT = (1 << 3),
        GLSLANG_MSG_VULKAN_RULES_BIT = (1 << 4),
        GLSLANG_MSG_ONLY_PREPROCESSOR_BIT = (1 << 5),
        GLSLANG_MSG_READ_HLSL_BIT = (1 << 6),
        GLSLANG_MSG_CASCADING_ERRORS_BIT = (1 << 7),
        GLSLANG_MSG_KEEP_UNCALLED_BIT = (1 << 8),
        GLSLANG_MSG_HLSL_OFFSETS_BIT = (1 << 9),
        GLSLANG_MSG_DEBUG_INFO_BIT = (1 << 10),
        GLSLANG_MSG_HLSL_ENABLE_16BIT_TYPES_BIT = (1 << 11),
        GLSLANG_MSG_HLSL_LEGALIZATION_BIT = (1 << 12),
        GLSLANG_MSG_HLSL_DX9_COMPATIBLE_BIT = (1 << 13),
        GLSLANG_MSG_BUILTIN_SYMBOL_TABLE_BIT = (1 << 14),
        GLSLANG_MSG_ENHANCED = (1 << 15),
        GLSLANG_MSG_ABSOLUTE_PATH = (1 << 16),
        GLSLANG_MSG_DISPLAY_ERROR_COLUMN = (1 << 17),
        GLSLANG_MSG_LINK_TIME_OPTIMIZATION_BIT = (1 << 18),
        GLSLANG_MSG_VALIDATE_CROSS_STAGE_IO_BIT = (1 << 19),
        GLSLANG_MSG_COUNT = (1 << 20) // LAST_ELEMENT_MARKER, not a real flag
    }

    [Flags]
    public enum glslang_reflection_options_t
    {
        GLSLANG_REFLECTION_DEFAULT_BIT = 0,
        GLSLANG_REFLECTION_STRICT_ARRAY_SUFFIX_BIT = (1 << 0),
        GLSLANG_REFLECTION_BASIC_ARRAY_SUFFIX_BIT = (1 << 1),
        GLSLANG_REFLECTION_INTERMEDIATE_IOO_BIT = (1 << 2),
        GLSLANG_REFLECTION_SEPARATE_BUFFERS_BIT = (1 << 3),
        GLSLANG_REFLECTION_ALL_BLOCK_VARIABLES_BIT = (1 << 4),
        GLSLANG_REFLECTION_UNWRAP_IO_BLOCKS_BIT = (1 << 5),
        GLSLANG_REFLECTION_ALL_IO_VARIABLES_BIT = (1 << 6),
        GLSLANG_REFLECTION_SHARED_STD140_SSBO_BIT = (1 << 7),
        GLSLANG_REFLECTION_SHARED_STD140_UBO_BIT = (1 << 8),
        GLSLANG_REFLECTION_COUNT = (1 << 9) // LAST_ELEMENT_MARKER, not a real flag
    }

    [Flags]
    public enum glslang_profile_t
    {
        GLSLANG_BAD_PROFILE = 0,
        GLSLANG_NO_PROFILE = (1 << 0),
        GLSLANG_CORE_PROFILE = (1 << 1),
        GLSLANG_COMPATIBILITY_PROFILE = (1 << 2),
        GLSLANG_ES_PROFILE = (1 << 3),
        GLSLANG_PROFILE_COUNT = (1 << 4) // LAST_ELEMENT_MARKER, not a real flag
    }

    [Flags]
    public enum glslang_shader_options_t
    {
        GLSLANG_SHADER_DEFAULT_BIT = 0,
        GLSLANG_SHADER_AUTO_MAP_BINDINGS = (1 << 0),
        GLSLANG_SHADER_AUTO_MAP_LOCATIONS = (1 << 1),
        GLSLANG_SHADER_VULKAN_RULES_RELAXED = (1 << 2),
        GLSLANG_SHADER_COUNT = (1 << 3) // LAST_ELEMENT_MARKER, not a real flag
    }

    public enum glslang_resource_type_t
    {
        GLSLANG_RESOURCE_TYPE_SAMPLER,
        GLSLANG_RESOURCE_TYPE_TEXTURE,
        GLSLANG_RESOURCE_TYPE_IMAGE,
        GLSLANG_RESOURCE_TYPE_UBO,
        GLSLANG_RESOURCE_TYPE_SSBO,
        GLSLANG_RESOURCE_TYPE_UAV,
        GLSLANG_RESOURCE_TYPE_COUNT // LAST_ELEMENT_MARKER
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct glslang_shader_t
    {
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct glslang_program_t
    {
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct glslang_mapper_t
    {
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct glslang_resolver_t
    {
    }

    // Version counterpart
    [StructLayout(LayoutKind.Sequential)]
    public struct glslang_version_t
    {
        public int major;
        public int minor;
        public int patch;
        public IntPtr flavor; // const char* -> IntPtr (use Marshal.PtrToStringAnsi to read)
    }

    // TLimits counterpart
    [StructLayout(LayoutKind.Sequential)]
    public struct glslang_limits_t
    {
        [MarshalAs(UnmanagedType.I1)] public bool non_inductive_for_loops;
        [MarshalAs(UnmanagedType.I1)] public bool while_loops;
        [MarshalAs(UnmanagedType.I1)] public bool do_while_loops;
        [MarshalAs(UnmanagedType.I1)] public bool general_uniform_indexing;
        [MarshalAs(UnmanagedType.I1)] public bool general_attribute_matrix_vector_indexing;
        [MarshalAs(UnmanagedType.I1)] public bool general_varying_indexing;
        [MarshalAs(UnmanagedType.I1)] public bool general_sampler_indexing;
        [MarshalAs(UnmanagedType.I1)] public bool general_variable_indexing;
        [MarshalAs(UnmanagedType.I1)] public bool general_constant_matrix_vector_indexing;
    }

    // TBuiltInResource counterpart
    [StructLayout(LayoutKind.Sequential)]
    public struct glslang_resource_t
    {
        public int max_lights;
        public int max_clip_planes;
        public int max_texture_units;
        public int max_texture_coords;
        public int max_vertex_attribs;
        public int max_vertex_uniform_components;
        public int max_varying_floats;
        public int max_vertex_texture_image_units;
        public int max_combined_texture_image_units;
        public int max_texture_image_units;
        public int max_fragment_uniform_components;
        public int max_draw_buffers;
        public int max_vertex_uniform_vectors;
        public int max_varying_vectors;
        public int max_fragment_uniform_vectors;
        public int max_vertex_output_vectors;
        public int max_fragment_input_vectors;
        public int min_program_texel_offset;
        public int max_program_texel_offset;
        public int max_clip_distances;
        public int max_compute_work_group_count_x;
        public int max_compute_work_group_count_y;
        public int max_compute_work_group_count_z;
        public int max_compute_work_group_size_x;
        public int max_compute_work_group_size_y;
        public int max_compute_work_group_size_z;
        public int max_compute_uniform_components;
        public int max_compute_texture_image_units;
        public int max_compute_image_uniforms;
        public int max_compute_atomic_counters;
        public int max_compute_atomic_counter_buffers;
        public int max_varying_components;
        public int max_vertex_output_components;
        public int max_geometry_input_components;
        public int max_geometry_output_components;
        public int max_fragment_input_components;
        public int max_image_units;
        public int max_combined_image_units_and_fragment_outputs;
        public int max_combined_shader_output_resources;
        public int max_image_samples;
        public int max_vertex_image_uniforms;
        public int max_tess_control_image_uniforms;
        public int max_tess_evaluation_image_uniforms;
        public int max_geometry_image_uniforms;
        public int max_fragment_image_uniforms;
        public int max_combined_image_uniforms;
        public int max_geometry_texture_image_units;
        public int max_geometry_output_vertices;
        public int max_geometry_total_output_components;
        public int max_geometry_uniform_components;
        public int max_geometry_varying_components;
        public int max_tess_control_input_components;
        public int max_tess_control_output_components;
        public int max_tess_control_texture_image_units;
        public int max_tess_control_uniform_components;
        public int max_tess_control_total_output_components;
        public int max_tess_evaluation_input_components;
        public int max_tess_evaluation_output_components;
        public int max_tess_evaluation_texture_image_units;
        public int max_tess_evaluation_uniform_components;
        public int max_tess_patch_components;
        public int max_patch_vertices;
        public int max_tess_gen_level;
        public int max_viewports;
        public int max_vertex_atomic_counters;
        public int max_tess_control_atomic_counters;
        public int max_tess_evaluation_atomic_counters;
        public int max_geometry_atomic_counters;
        public int max_fragment_atomic_counters;
        public int max_combined_atomic_counters;
        public int max_atomic_counter_bindings;
        public int max_vertex_atomic_counter_buffers;
        public int max_tess_control_atomic_counter_buffers;
        public int max_tess_evaluation_atomic_counter_buffers;
        public int max_geometry_atomic_counter_buffers;
        public int max_fragment_atomic_counter_buffers;
        public int max_combined_atomic_counter_buffers;
        public int max_atomic_counter_buffer_size;
        public int max_transform_feedback_buffers;
        public int max_transform_feedback_interleaved_components;
        public int max_cull_distances;
        public int max_combined_clip_and_cull_distances;
        public int max_samples;
        public int max_mesh_output_vertices_nv;
        public int max_mesh_output_primitives_nv;
        public int max_mesh_work_group_size_x_nv;
        public int max_mesh_work_group_size_y_nv;
        public int max_mesh_work_group_size_z_nv;
        public int max_task_work_group_size_x_nv;
        public int max_task_work_group_size_y_nv;
        public int max_task_work_group_size_z_nv;
        public int max_mesh_view_count_nv;
        public int max_mesh_output_vertices_ext;
        public int max_mesh_output_primitives_ext;
        public int max_mesh_work_group_size_x_ext;
        public int max_mesh_work_group_size_y_ext;
        public int max_mesh_work_group_size_z_ext;
        public int max_task_work_group_size_x_ext;
        public int max_task_work_group_size_y_ext;
        public int max_task_work_group_size_z_ext;
        public int max_mesh_view_count_ext;

        // Union for max_dual_source_draw_buffers_ext / maxDualSourceDrawBuffersEXT
        public int max_dual_source_draw_buffers_ext;

        public glslang_limits_t limits;
    }

    // Inclusion result structure
    [StructLayout(LayoutKind.Sequential)]
    public struct glsl_include_result_t
    {
        public IntPtr header_name; // const char* -> IntPtr
        public IntPtr header_data; // const char* -> IntPtr
        public UIntPtr header_length; // size_t -> UIntPtr
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct glsl_include_callbacks_t
    {
        public IntPtr include_system; // glsl_include_system_func
        public IntPtr include_local; // glsl_include_local_func
        public IntPtr free_include_result; // glsl_free_include_result_func
        // You can use the delegate types above and assign them via Marshal.GetFunctionPointerForDelegate if required
    }

    // glslang_input_t
    [StructLayout(LayoutKind.Sequential)]
    public struct glslang_input_t
    {
        public glslang_source_t language; // glslang_source_t (assume enum)
        public glslang_stage_t stage; // glslang_stage_t (assume enum)
        public glslang_client_t client; // glslang_client_t (assume enum)
        public glslang_target_client_version_t client_version; // glslang_target_client_version_t (assume enum)
        public glslang_target_language_t target_language; // glslang_target_language_t (assume enum)
        public glslang_target_language_version_t target_language_version; // glslang_target_language_version_t (assume enum)
        public IntPtr code; // const char*
        public int default_version;
        public glslang_profile_t default_profile; // glslang_profile_t (assume enum)
        public int force_default_version_and_profile;
        public int forward_compatible;
        public glslang_messages_t messages; // glslang_messages_t (assume enum/flags)
        public IntPtr resource; // const glslang_resource_t* (pointer)
        public glsl_include_callbacks_t callbacks;
        public IntPtr callbacks_ctx; // void*
    }


    // SpvOptions counterpart
    [StructLayout(LayoutKind.Sequential)]
    public struct glslang_spv_options_t
    {
        [MarshalAs(UnmanagedType.I1)] public bool generate_debug_info;
        [MarshalAs(UnmanagedType.I1)] public bool strip_debug_info;
        [MarshalAs(UnmanagedType.I1)] public bool disable_optimizer;
        [MarshalAs(UnmanagedType.I1)] public bool optimize_size;
        [MarshalAs(UnmanagedType.I1)] public bool disassemble;
        [MarshalAs(UnmanagedType.I1)] public bool validate;
        [MarshalAs(UnmanagedType.I1)] public bool emit_nonsemantic_shader_debug_info;
        [MarshalAs(UnmanagedType.I1)] public bool emit_nonsemantic_shader_debug_source;
        [MarshalAs(UnmanagedType.I1)] public bool compile_only;
        [MarshalAs(UnmanagedType.I1)] public bool optimize_allow_expanded_id_bound;
    }


    // ----------------------------------------------------------------
    // Function Delegates

    // Collection of callbacks for GLSL preprocessor
    // glsl_include_result_t* (*glsl_include_system_func)(void* ctx, const char* header_name, const char* includer_name, size_t include_depth);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    public delegate glsl_include_result_t* glsl_include_system_func(IntPtr ctx, IntPtr header_name,
        IntPtr includer_name, UIntPtr include_depth);

    // glsl_include_result_t* (*glsl_include_local_func)(void* ctx, const char* header_name, const char* includer_name, size_t include_depth)
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    public delegate glsl_include_result_t* glsl_include_local_func(IntPtr ctx, IntPtr header_name, IntPtr includer_name,
        UIntPtr include_depth);

    //  int (*glsl_free_include_result_func)(void* ctx, glsl_include_result_t* result);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    public delegate int glsl_free_include_result_func(IntPtr ctx, glsl_include_result_t* result);
    
    // ----------------------------------------------------------------
    // Functions
    
    // glslang_get_version
    //  void glslang_get_version(glslang_version_t* version);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_get_version(glslang_version_t* version);

    // glslang_initialize_process
    //  int glslang_initialize_process(void);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int glslang_initialize_process();

    // glslang_finalize_process
    //  void glslang_finalize_process(void);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_finalize_process();

    // glslang_shader_create
    //  glslang_shader_t* glslang_shader_create(const glslang_input_t* input);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern glslang_shader_t* glslang_shader_create(glslang_input_t* input);

    // glslang_shader_delete
    //  void glslang_shader_delete(glslang_shader_t* shader);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_shader_delete(glslang_shader_t* shader);

    // glslang_shader_set_preamble
    //  void glslang_shader_set_preamble(glslang_shader_t* shader, const char* s);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_shader_set_preamble(glslang_shader_t* shader, IntPtr s);

    // glslang_shader_shift_binding
    //  void glslang_shader_shift_binding(glslang_shader_t* shader, glslang_resource_type_t res, unsigned int base);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_shader_shift_binding(glslang_shader_t* shader, glslang_resource_type_t res, uint @base);

    // glslang_shader_shift_binding_for_set
    //  void glslang_shader_shift_binding_for_set(glslang_shader_t* shader, glslang_resource_type_t res, unsigned int base, unsigned int set);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_shader_shift_binding_for_set(glslang_shader_t* shader, glslang_resource_type_t res, uint @base, uint set);

    // glslang_shader_set_options
    //  void glslang_shader_set_options(glslang_shader_t* shader, int options); // glslang_shader_options_t
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_shader_set_options(glslang_shader_t* shader, int options);

    // glslang_shader_set_glsl_version
    //  void glslang_shader_set_glsl_version(glslang_shader_t* shader, int version);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_shader_set_glsl_version(glslang_shader_t* shader, int version);

    // glslang_shader_set_default_uniform_block_set_and_binding
    //  void glslang_shader_set_default_uniform_block_set_and_binding(glslang_shader_t* shader, unsigned int set, unsigned int binding);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_shader_set_default_uniform_block_set_and_binding(glslang_shader_t* shader, uint set, uint binding);

    // glslang_shader_set_default_uniform_block_name
    //  void glslang_shader_set_default_uniform_block_name(glslang_shader_t* shader, const char *name);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_shader_set_default_uniform_block_name(glslang_shader_t shader, IntPtr name);

    // glslang_shader_set_resource_set_binding
    //  void glslang_shader_set_resource_set_binding(glslang_shader_t* shader, const char *const *bindings, unsigned int num_bindings);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_shader_set_resource_set_binding(glslang_shader_t* shader, IntPtr bindings, uint num_bindings);

    // glslang_shader_preprocess
    //  int glslang_shader_preprocess(glslang_shader_t* shader, const glslang_input_t* input);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int glslang_shader_preprocess(glslang_shader_t* shader, glslang_input_t* input);

    // glslang_shader_parse
    //  int glslang_shader_parse(glslang_shader_t* shader, const glslang_input_t* input);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int glslang_shader_parse(glslang_shader_t* shader, glslang_input_t* input);

    // glslang_shader_get_preprocessed_code
    //  const char* glslang_shader_get_preprocessed_code(glslang_shader_t* shader);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr glslang_shader_get_preprocessed_code(glslang_shader_t* shader);

    // glslang_shader_set_preprocessed_code
    //  void glslang_shader_set_preprocessed_code(glslang_shader_t* shader, const char* code);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_shader_set_preprocessed_code(glslang_shader_t* shader, IntPtr code);

    // glslang_shader_get_info_log
    //  const char* glslang_shader_get_info_log(glslang_shader_t* shader);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr glslang_shader_get_info_log(glslang_shader_t* shader);

    // glslang_shader_get_info_debug_log
    //  const char* glslang_shader_get_info_debug_log(glslang_shader_t* shader);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr glslang_shader_get_info_debug_log(glslang_shader_t* shader);

    // glslang_program_create
    //  glslang_program_t* glslang_program_create(void);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern glslang_program_t* glslang_program_create();

    // glslang_program_delete
    //  void glslang_program_delete(glslang_program_t* program);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_program_delete(glslang_program_t* program);

    // glslang_program_add_shader
    //  void glslang_program_add_shader(glslang_program_t* program, glslang_shader_t* shader);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_program_add_shader(glslang_program_t* program, glslang_shader_t* shader);

    // glslang_program_link
    //  int glslang_program_link(glslang_program_t* program, int messages); // glslang_messages_t
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int glslang_program_link(glslang_program_t* program, glslang_messages_t messages);

    // glslang_program_add_source_text
    //  void glslang_program_add_source_text(glslang_program_t* program, glslang_stage_t stage, const char* text, size_t len);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_program_add_source_text(glslang_program_t* program, glslang_stage_t stage, IntPtr text, UIntPtr len);

    // glslang_program_set_source_file
    //  void glslang_program_set_source_file(glslang_program_t* program, glslang_stage_t stage, const char* file);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_program_set_source_file(glslang_program_t* program, glslang_stage_t stage, IntPtr file);

    // glslang_program_map_io
    //  int glslang_program_map_io(glslang_program_t* program);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int glslang_program_map_io(glslang_program_t* program);

    // glslang_program_map_io_with_resolver_and_mapper
    //  int glslang_program_map_io_with_resolver_and_mapper(glslang_program_t* program, glslang_resolver_t* resolver, glslang_mapper_t* mapper);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern int glslang_program_map_io_with_resolver_and_mapper(glslang_program_t* program, glslang_resolver_t* resolver, glslang_mapper_t* mapper);

    // glslang_program_SPIRV_generate
    //  void glslang_program_SPIRV_generate(glslang_program_t* program, glslang_stage_t stage);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_program_SPIRV_generate(glslang_program_t* program, glslang_stage_t stage);

    // glslang_program_SPIRV_generate_with_options
    //  void glslang_program_SPIRV_generate_with_options(glslang_program_t* program, glslang_stage_t stage, glslang_spv_options_t* spv_options);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_program_SPIRV_generate_with_options(glslang_program_t* program, glslang_stage_t stage, glslang_spv_options_t* spv_options);

    // glslang_program_SPIRV_get_size
    //  size_t glslang_program_SPIRV_get_size(glslang_program_t* program);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern UIntPtr glslang_program_SPIRV_get_size(glslang_program_t* program);

    // glslang_program_SPIRV_get
    //  void glslang_program_SPIRV_get(glslang_program_t* program, unsigned int*);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_program_SPIRV_get(glslang_program_t* program, IntPtr spirvBuffer);

    // glslang_program_SPIRV_get_ptr
    //  unsigned int* glslang_program_SPIRV_get_ptr(glslang_program_t* program);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr glslang_program_SPIRV_get_ptr(glslang_program_t* program);

    // glslang_program_SPIRV_get_messages
    //  const char* glslang_program_SPIRV_get_messages(glslang_program_t* program);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr glslang_program_SPIRV_get_messages(glslang_program_t* program);

    // glslang_program_get_info_log
    //  const char* glslang_program_get_info_log(glslang_program_t* program);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr glslang_program_get_info_log(glslang_program_t* program);

    // glslang_program_get_info_debug_log
    //  const char* glslang_program_get_info_debug_log(glslang_program_t* program);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr glslang_program_get_info_debug_log(glslang_program_t* program);

    // glslang_glsl_mapper_create
    //  glslang_mapper_t* glslang_glsl_mapper_create(void);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern glslang_mapper_t* glslang_glsl_mapper_create();

    // glslang_glsl_mapper_delete
    //  void glslang_glsl_mapper_delete(glslang_mapper_t* mapper);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_glsl_mapper_delete(glslang_mapper_t* mapper);

    // glslang_glsl_resolver_create
    //  glslang_resolver_t* glslang_glsl_resolver_create(glslang_program_t* program, glslang_stage_t stage);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern glslang_resolver_t* glslang_glsl_resolver_create(glslang_program_t* program, glslang_stage_t stage);

    // glslang_glsl_resolver_delete
    //  void glslang_glsl_resolver_delete(glslang_resolver_t* resolver);
    [DllImport(GLSLANG_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_glsl_resolver_delete(glslang_resolver_t* resolver);
    
    // ----------------------------------------------------------------
    // The following functions for resource limits come from <glslang/Public/resource_limits_c.h>
    
    // Returns a struct that can be used to create custom resource values.
    //  glslang_resource_t* glslang_resource(void);
    [DllImport(GLSLANG_RESOURCE_LIMITS_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern glslang_resource_t* glslang_resource();

    // These are the default resources for TBuiltInResources, used for both
    //  - parsing this string for the case where the user didn't supply one,
    //  - dumping out a template for user construction of a config file.
    //  const glslang_resource_t* glslang_default_resource(void);
    [DllImport(GLSLANG_RESOURCE_LIMITS_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern glslang_resource_t* glslang_default_resource();

    // Returns the DefaultTBuiltInResource as a human-readable string.
    // NOTE: User is responsible for freeing this string.
    //  const char* glslang_default_resource_string();
    [DllImport(GLSLANG_RESOURCE_LIMITS_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern IntPtr glslang_default_resource_string();

    // Decodes the resource limits from |config| to |resources|.
    //  void glslang_decode_resource_limits(glslang_resource_t* resources, char* config);
    [DllImport(GLSLANG_RESOURCE_LIMITS_DLL, CallingConvention = CallingConvention.Cdecl)]
    public static extern void glslang_decode_resource_limits(glslang_resource_t* resources, IntPtr config);
}