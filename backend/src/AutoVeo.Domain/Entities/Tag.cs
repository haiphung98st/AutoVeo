namespace AutoVeo.Domain.Entities;

public class Tag
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    public ICollection<VideoTag> VideoTags { get; set; } = new List<VideoTag>();
}

public class VideoTag
{
    public Guid VideoId { get; set; }
    public int TagId { get; set; }

    public VideoLibraryItem Video { get; set; } = null!;
    public Tag Tag { get; set; } = null!;
}
