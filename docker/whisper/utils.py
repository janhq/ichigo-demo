from ichigo_whisper.config.vq_config import VQConfig
from components import IchigoTokenizer
import os
import torch
from huggingface_hub import hf_hub_download

def convert_ids_to_tokens(id_list):
    """
    Convert a list of IDs to a compressed sound token string.
    
    Args:
        id_list (list): List of sound IDs
    
    Returns:
        str: Formatted string with sound tokens and duration
    """
    if not id_list:
        return "<|sound_start|><|sound_end|>"
    
    result = ["<|sound_start|>"]
    i = 0
    
    while i < len(id_list):
        current_id = id_list[i]
        count = 1
        
        # Count consecutive occurrences of the same ID
        while i + count < len(id_list) and id_list[i + count] == current_id:
            count += 1
            
        # Add duration token if count > 1
        if count > 1:
            result.append(f"<|duration_{str(count).zfill(2)}|>")
            
        # Add the sound token (each ID separately)
        result.append(f"<|sound_{str(current_id).zfill(4)}|>")
        
        # Move index forward
        i += count
    
    result.append("<|sound_end|>")
    return "".join(result)

def make_ichigo_tokenizer(
    size: str,
    no_quantize=False,
    config: VQConfig = VQConfig(),
    dataset=None,
):
    common = dict(
        q_depth=1,
        depth=1,
        threshold_ema_dead_code=0,
        use_cosine_sim=True,
        config=config,
        no_quantize=no_quantize,
    )

    model_configs = {
        "medium-vi-2d-512c-dim64": dict(
            codebook_dim=64,
            vq_codes=512,
            n_head=16,
            downsample=2,
            whisper_model_name="medium",
        ),
        "medium-vi-2d-1024c-dim64": dict(
            codebook_dim=64,
            vq_codes=1024,
            n_head=16,
            downsample=2,
            whisper_model_name="medium",
        ),
        "medium-vi-2d-2048c-dim64": dict(
            codebook_dim=64,
            vq_codes=2048,
            n_head=16,
            downsample=2,
            whisper_model_name="medium",
        ),
        "merge-medium-vi-2d-2560c-dim64": dict(
            codebook_dim=64,
            vq_codes=2560,
            n_head=16,
            downsample=2,
            whisper_model_name="medium",
        ),
        "large-v3-vi-2d-512c-dim64": dict(
            codebook_dim=64,
            vq_codes=512,
            n_head=20,
            head_width=64,
            downsample=2,
            whisper_model_name="large-v3",
        ),
        "large-v3-vi-2d-1024c-dim64": dict(
            codebook_dim=64,
            vq_codes=1024,
            n_head=20,
            head_width=64,
            downsample=2,
            whisper_model_name="large-v3",
        ),
        "large-v3-vi-2d-2048c-dim64": dict(
            codebook_dim=64,
            vq_codes=2048,
            n_head=20,
            head_width=64,
            downsample=2,
            whisper_model_name="large-v3",
        ),
    }

    if size in model_configs:
        return IchigoTokenizer(**model_configs[size], **common)

    raise ValueError(f"Unknown model size: {size}")

# A modified loading method that load only the quantize part of CustomRQBottleneckTransformer.
def load_model(
    ref,
    size: str,
    repo_id=None,
    filename=None,
    local_dir=None,
    local_filename=None,
):
    """Load model from file or Hugging Face Hub.

    Args:
        ref (str): Either a local path or "repo_id:filename" format
        repo_id (str, optional): Hugging Face repository ID
        filename (str, optional): Filename in the repository
        local_dir (str, optional): Local directory for downloads
        local_filename (str, optional): Direct path to local file

    Returns:
        RQBottleneckTransformer: Loaded model instance
    """
    # Parse reference string
    if repo_id is None and filename is None and local_filename is None:
        if ":" in ref:
            repo_id, filename = ref.split(":", 1)
        else:
            local_filename = ref

    # Download or use local file
    if not os.path.exists(f"{local_filename}"):
        local_filename = hf_hub_download(
            repo_id=repo_id, filename=filename, local_dir=local_dir
        )

    # Load and validate spec
    spec = torch.load(local_filename)
    model_state_dict = {
        k.replace("model.", ""): v for k, v in spec["state_dict"].items()
    }
    required_components = {
        'rq', 'mlp', 'mlp_ln'
    }
    filtered_state_dict = {
        k: v for k, v in model_state_dict.items()
        if any(k.startswith(comp) for comp in required_components)
    }
    vq_config = VQConfig()
    ichigo_model = make_ichigo_tokenizer(size=size, config=vq_config)
    ichigo_model.load_state_dict(filtered_state_dict, strict=False)
    ichigo_model.eval()
    return ichigo_model

if __name__ == "__main__":
    ichigo_name = "homebrewltd/Ichigo-whisper-v0.1:merge-medium-vi-2d-2560c-dim64.pth"
    model_size = "merge-medium-vi-2d-2560c-dim64"
    device = "cuda" if torch.cuda.is_available() else "cpu"
    ichigo_model = load_model(ref=ichigo_name, size=model_size)
    ichigo_model.setup(device=device)
    ichigo_model.to(device)