import { useState } from 'react';
import { BookOpen, Edit3, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import "./markdown.css"

const defaultContent = `
# Data Management Portal Documentation

Welcome to the Data Management Portal! This guide will help you understand and use all the features of the portal.

## Functionality Overview

The Data Management Portal is a comprehensive solution for managing DCAT-AP data feeds, SHACL shapes, and semantic alignment pipelines.

### Key Features

- **Data Portal**: Load (LDES) DCAT-AP feeds, and map the contained datasets to RDF using [YARRRML](https://rml.io/yarrrml/)
- **RDF Portal**: Filter the RDF datasets from the loaded feeds, and export them in the desired dataset profile using the alignment pipelines
- **Alignment Pipelines**: Manage and add alignment pipelines between dataset profiles
- **Dataset Profile Registry**: Overview of the loaded dataset profiles, and their connected datasets and pipelines

---

## 1 Data Portal

### 1.1 Adding Data Feeds

To add an (LDES) DCAT-AP feed to the system

1. Navigate tot he **Data Portal** page
2. Click "Add Feed" button
3. Add the URL of the (LDES) DCAT-AP feed
4. The system will automatically discover and list available datasets

Notes: 

For the demo, added feeds and pipelines are not stored internally, but mapped datasets are persisted both in the feed and on the target location. 
For a finished component, the Data Hub / Vocabulary Hub server will want to persist these feeds and keep up to date with remote sources.

### 1.2 Browsing Datasets

Once feeds are added, you can:

- **Search** datasets by title, description, or publisher
- **Filter** the datasets on keywords
- **Select** datasets for mapping

### 1.3 Mapping Datasets

Now, the loaded datasets that are not yet published in an RDF format, 
can be mapped to RDF using a YARRRML -> RML -> RDF pipeline in the **Dataset RML Mapping** component.

1. Select the dataset(s) to map in the **Dataset Browser** component.
2. Add a YARRRRML mapping 
3. Select a mapping service to perform the YARRRML -> RML -> RDF conversion for your chosen dataset(s)
4. Add a mapping target location, where the mapped RDF dataset should be POSTed.
5. Select the feed to which this new distribution of the dataset should be added.
6. Either select a profile, or create a new profile, under which the resulting RDF document is published
7. After updating the feed, it is refreshed to load the new dataset.

Notes:

The current implementation treats every input resource as a source "data.json". This is for demo purposes, and a solution should be found as to how loaded resources can automatically map to the defined sources in avaialble mappings.

The mapping service can be found at [https://github.com/Dexagod/yarrrml-to-rml-service-docker](https://github.com/Dexagod/yarrrml-to-rml-service-docker). You can run this locally and use the default URL.

---

## 2 RDF Portal 

### 2.1 Selecting datasets

Similarly to the **Data Portal** page, datasets can be filtered using:

- **Search** on datasets by title, description, or publisher
- **Feed** using the feed component
- **Filtering** on the used keywords
- **Selection** of the resulting datasets in the dataset browser component.


### 2.2 Exporting datasets

Exporting the chosen datasets, is done with the **Export Datasets** component.
Here, the selected datasets are exported by 

1. loading the selected datasets
2. (optional) mapping the resulting datasets into the target profile using the available pipelines
3. loading the resulting datasets and mappings into the target graphstore (default URL is setup for a local oxigraph service hosted in docker)
4. the target named graph in whcih the resulting datasets should be loaded can be changed, or left on the default graph

---

## 3 Alignment pipelines

### 3.1 Adding a pipeline

1. Select the "Add pipeline" button in the **Pipeline Sources** component
2. Enter a name for the new pipeline
3. Select a source and target profile between which the pipeline performs an alignment
4. Select the pipelines feed to which the new pipeline should be added
5. Add relevant keywords
6. Add the SPARQL Construct query that performs the profile alignment
7. Select "Add pipeline" to finish the process

### 3.2 Filtering pipelines

The **Pipeline Browser** component enables the browsing of the available pipelines in the vocabulary hub feeds.
This component shows the source and target profiles of the pipeline, as well as the used SPARQL Construct query to perform the alignment.

Notes:

Since the alignment happens through a docker container performed at the client or dataspace service, other methods than SPARQL Construct can be employed for this alignment.

---

## 4. Dataset Profile Registry

This page keeps track of the dataset profiles used in the published datasets and alignment pipelines.
The concept of a *Dataset Profile* is used to provide a comprehensive description of a dataset, 
based on the availability of both the used ontologies, and associated SHACL shape assigned to 
the contents of a dataset.

---

## The Vocabulary Hub

The Vocabulary Hub operates on a point between the client and server.
The server component of the Vocabulary Hub keeps track of a set of "feeds", that are persisted, maintained and updated on the server.
This includes the tracked dcat-ap feeds, dataset profile alignment pipeline feeds, and any other data that should be persisted at ecosystem level.

In terms of performing alignments, based on the availability of semantic data, dataset profile metadata and alignment pipelines, 
this can happen both at the edge by the client, or by distributed services avaialble in the data ecosystems.

The resulting resources of RML mapping or Semantic Alignment mapping processes can be re-published to the data space as alternative
distributions of the same datasets using DCAT.

---

## Interface

The choice of browser interface is for demonstration purposes, 
similar functionality can be installed as CLI pipelines that automate this functionality.
`;

export function DocumentationPage() {
  

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <h2 className="text-gray-900">Documentation</h2>
            </div>
          </div>
        </div>
        <div className="p-6 border-b border-gray-200">
          <div className="max-w-3xl mx-auto">
            <h3 className="text-gray-900 mb-2">Demo video</h3>
            <div className="w-full rounded overflow-hidden">
              <video controls className="w-full h-auto rounded-md" preload="metadata">
                {/* Try both possible locations so the video loads in dev (repo root) and in production (docs as root) */}
                {/* <source src="/video/my-video.mp4" type="video/mp4" /> */}
                <source src="/docs/video/my-video.mp4" type="video/mp4" />
                Your browser does not support the video tag. You can <a href="/video/my-video.mp4">download the video</a> instead.
              </video>
            </div>
          </div>
        </div>
        <div className="p-8 prose prose-blue max-w-none">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h1 className="text-gray-900 mt-8 mb-4 pb-3 border-b border-gray-200 first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-gray-900 mt-8 mb-3">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-gray-900 mt-6 mb-2">
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p className="text-gray-700 leading-relaxed mb-4">
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside text-gray-700 mb-4 space-y-1">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside text-gray-700 mb-4 space-y-1">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-gray-700 ml-4">
                  {children}
                </li>
              ),
              code: ({ className, children }) => {
                const isBlock = className?.includes('language-');
                if (isBlock) {
                  return (
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
                      <code className="text-sm">{children}</code>
                    </pre>
                  );
                }
                return (
                  <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm">
                    {children}
                  </code>
                );
              },
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 my-4">
                  {children}
                </blockquote>
              ),
              hr: () => (
                <hr className="border-gray-200 my-8" />
              ),
              strong: ({ children }) => (
                <strong className="text-gray-900">
                  {children}
                </strong>
              ),
              a: ({ href, children }) => (
                <a
                  href={href}
                  className="text-blue-600 hover:text-blue-800 underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
            }}
          >
            {defaultContent}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
