export const vocabularyShaclShape = `
@prefix sh:   <http://www.w3.org/ns/shacl#> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dct:  <http://purl.org/dc/terms/> .
@prefix dqv:  <http://www.w3.org/ns/dqv#> .
@prefix adms: <http://www.w3.org/ns/adms#> .
@prefix r5r:  <http://data.europa.eu/r5r/> .
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix ex:   <http://example.org/shapes#> .

#################################################################
# Shape for a vocabulary/dataset description (as used in LOV/DCAT)
#################################################################

ex:VocabularyDatasetShape
    a sh:NodeShape ;
    sh:targetClass dcat:Dataset ;

    # rdf:type dcat:Dataset is implied by targetClass, but we can require it explicitly:
    sh:property [
        sh:path rdf:type ;
        sh:hasValue dcat:Dataset ;
        sh:minCount 1 ;
        sh:maxCount 1 ;
    ] ;

    # dct:subject – at least one subject URI
    sh:property [
        sh:path dct:subject ;
        sh:nodeKind sh:IRI ;
        sh:minCount 1 ;
    ] ;

    # dct:title – at least one language-tagged title
    sh:property [
        sh:path dct:title ;
        sh:datatype rdf:langString ;
        sh:minCount 1 ;
    ] ;

    # dct:description – at least one language-tagged description
    sh:property [
        sh:path dct:description ;
        sh:datatype rdf:langString ;
        sh:minCount 1 ;
    ] ;

    # dcat:theme – at least one theme URI
    sh:property [
        sh:path dcat:theme ;
        sh:nodeKind sh:IRI ;
        sh:minCount 1 ;
    ] ;

    # dcat:keyword – at least one keyword literal (with or without language tag)
    sh:property [
        sh:path dcat:keyword ;
        sh:nodeKind sh:Literal ;
        sh:minCount 1 ;
    ] ;

    # dcat:distribution – at least one distribution
    sh:property [
        sh:path dcat:distribution ;
        sh:nodeKind sh:IRI ;
        sh:minCount 1 ;
    ] ;

    # adms:sample – 0 or 1 sample distribution
    sh:property [
        sh:path adms:sample ;
        sh:nodeKind sh:IRI ;
        sh:maxCount 1 ;
    ] ;

    # dct:conformsTo – 0 or more URIs
    sh:property [
        sh:path dct:conformsTo ;
        sh:nodeKind sh:IRI ;
    ] ;

    # r5r:applicableLegislation – 0 or more URIs
    sh:property [
        sh:path r5r:applicableLegislation ;
        sh:nodeKind sh:IRI ;
    ] ;

    # dct:temporal – a temporal extent node (blank or IRI), at most one
    sh:property [
        sh:path dct:temporal ;
        sh:nodeKind sh:BlankNodeOrIRI ;
        sh:maxCount 1 ;
    ] ;

    # dqv:hasQualityAnnotation – 0 or more annotation nodes
    sh:property [
        sh:path dqv:hasQualityAnnotation ;
        sh:nodeKind sh:BlankNodeOrIRI ;
    ] ;

    # dqv:hasQualityMeasurement – 0 or more measurement nodes
    sh:property [
        sh:path dqv:hasQualityMeasurement ;
        sh:nodeKind sh:BlankNodeOrIRI ;
    ] .
`;

export const ontologyFeed = `
<myLDES> a ldes:EventStream;
    tree:member ex:myOntology/1.0/, ex:myOntology/1.1/.

ex:myOntology/1.0/
    a owl:Ontology ;
    dct:title "My Ontology"@en ;
    owl:versionIRI  <https://example.org/ontologies/myOntology/1.0/> ;
    owl:versionInfo "1.0" ;
    dct:isVersionOf <https://example.org/ontologies/myOntology>;
    dct:issued      "2025-01-10"^^xsd:date .

ex:myOntology/1.1/
    a owl:Ontology ;
    dct:title "My Ontology"@en ;
    owl:versionIRI  <https://example.org/ontologies/myOntology/1.1/> ;
    owl:versionInfo "1.1" ;
    dct:isVersionOf <https://example.org/ontologies/myOntology>;
    dct:issued      "2025-02-01"^^xsd:date .
`;

export const datasetFeed = `

<myLDES> a ldes:EventStream;
    tree:member ex:myDataset/1.0/, ex:myDataset/1.1/.

ex:myOntology/1.0/
    a owl:Ontology ;
    dct:title "My Ontology"@en ;
    owl:versionIRI  <https://example.org/ontologies/myOntology/1.0/> ;
    owl:versionInfo "1.0" ;
    dct:isVersionOf <https://example.org/ontologies/myOntology>;
    dct:issued      "2025-01-10"^^xsd:date .

ex:myOntology/1.1/
    a owl:Ontology ;
    dct:title "My Ontology"@en ;
    owl:versionIRI  <https://example.org/ontologies/myOntology/1.1/> ;
    owl:versionInfo "1.1" ;
    dct:isVersionOf <https://example.org/ontologies/myOntology>;
    dct:issued      "2025-02-01"^^xsd:date .
`;