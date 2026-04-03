import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import projectData from '../data/projects.json';
import { ArrowLeft } from 'lucide-react';

export default function ProjectView() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  
  const project = projectData.find(p => p.id === projectId);

  useEffect(() => {
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Fetch the text content associated with the project folder
    fetch(`/projects/${projectId}/content.txt`)
      .then(res => {
        if (res.ok) return res.text();
        return 'Content has not been added yet.';
      })
      .then(text => setContent(text))
      .catch(err => setContent('Error loading content.'));
  }, [projectId]);

  if (!project) return <div className="project-view">Project not found</div>;

  return (
    <div className="project-view">
      <div className="back-button" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        Back to Grid
      </div>
      
      <h1 className="project-title">{project.title}</h1>
      
      <div className="project-content">
        {content}
      </div>
      
      <div className="project-gallery">
        <img 
          src={`/projects/${projectId}/key-image.jpg`} 
          alt={`${project.title} main`}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <img 
          src={`/projects/${projectId}/images/demo.jpg`} 
          alt={`${project.title} detail`}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      </div>
    </div>
  );
}
